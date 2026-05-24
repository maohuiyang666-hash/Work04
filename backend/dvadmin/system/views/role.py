# -*- coding: utf-8 -*-

"""
@author: 猿小天
@contact: QQ:1638245306
@Created on: 2021/6/3 003 0:30
@Remark: 角色管理
"""
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from dvadmin.system.models import Role, Menu, MenuButton, Dept
from dvadmin.system.views.dept import DeptSerializer
from dvadmin.system.views.menu import MenuSerializer
from dvadmin.system.views.menu_button import MenuButtonSerializer
from dvadmin.utils.json_response import SuccessResponse, DetailResponse, ErrorResponse
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.validator import CustomUniqueValidator
from dvadmin.utils.viewset import CustomModelViewSet


class RoleSerializer(CustomModelSerializer):
    """
    角色-序列化器
    """

    class Meta:
        model = Role
        fields = "__all__"
        read_only_fields = ["id"]


class RoleInitSerializer(CustomModelSerializer):
    """
    初始化获取数信息(用于生成初始化json文件)
    """

    class Meta:
        model = Role
        fields = ['name', 'key', 'sort', 'status', 'admin', 'data_range', 'remark',
                  'creator', 'dept_belong_id']
        read_only_fields = ["id"]
        extra_kwargs = {
            'creator': {'write_only': True},
            'dept_belong_id': {'write_only': True}
        }


class RoleCreateUpdateSerializer(CustomModelSerializer):
    """
    角色管理 创建/更新时的列化器
    """
    menu = MenuSerializer(many=True, read_only=True)
    dept = DeptSerializer(many=True, read_only=True)
    permission = MenuButtonSerializer(many=True, read_only=True)
    key = serializers.CharField(max_length=50,
                                validators=[CustomUniqueValidator(queryset=Role.objects.all(), message="权限字符必须唯一")])
    name = serializers.CharField(max_length=50, validators=[CustomUniqueValidator(queryset=Role.objects.all())])

    def validate(self, attrs: dict):
        return super().validate(attrs)

    def save(self, **kwargs):
        is_superuser = self.request.user.is_superuser
        if not is_superuser:
            self.validated_data.pop('admin')
        data = super().save(**kwargs)
        data.dept.set(self.initial_data.get('dept', []))
        data.menu.set(self.initial_data.get('menu', []))
        data.permission.set(self.initial_data.get('permission', []))
        return data

    class Meta:
        model = Role
        fields = '__all__'


class MenuPermissonSerializer(CustomModelSerializer):
    """
    菜单的按钮权限
    """
    menuPermission = serializers.SerializerMethodField()

    def get_menuPermission(self, instance):
        is_superuser = self.request.user.is_superuser
        if is_superuser:
            queryset = MenuButton.objects.filter(menu__id=instance.id)
        else:
            menu_permission_id_list = self.request.user.role.values_list('permission',flat=True)
            queryset = MenuButton.objects.filter(id__in=menu_permission_id_list,menu__id=instance.id)
        serializer = MenuButtonSerializer(queryset,many=True, read_only=True)
        return serializer.data

    class Meta:
        model = Menu
        fields = ['id', 'parent', 'name', 'menuPermission']


class RoleViewSet(CustomModelViewSet):
    """
    角色管理接口
    list:查询
    create:新增
    update:修改
    retrieve:单例
    destroy:删除
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    create_serializer_class = RoleCreateUpdateSerializer
    update_serializer_class = RoleCreateUpdateSerializer
    search_fields = ['name', 'key']

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def role_get_menu(self, request):
        """根据当前用户的角色返回角色拥有的菜单"""
        is_superuser = request.user.is_superuser
        is_admin = request.user.role.values_list('admin',flat=True)
        if is_superuser or True in is_admin:
            queryset = Menu.objects.filter(status=1).all()
        else:
            menu_id_list = request.user.role.values_list('menu',flat=True)
            queryset = Menu.objects.filter(id__in=menu_id_list)
        # queryset = self.filter_queryset(queryset)
        serializer = MenuPermissonSerializer(queryset, many=True,request=request)
        return DetailResponse(data=serializer.data)

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def data_scope(self, request):
        is_superuser = request.user.is_superuser
        role_queryset = Role.objects.filter(users__id=request.user.id).values_list('data_range', flat=True)
        if is_superuser:
            data = [
                {
                    "value": 0,
                    "label": '仅本人数据权限'
                },
                {
                    "value": 1,
                    "label": '本部门及以下数据权限'
                },
                {
                    "value": 2,
                    "label": '本部门数据权限'
                },
                {
                    "value": 3,
                    "label": '全部数据权限'
                },
                {
                    "value": 4,
                    "label": '自定义数据权限'
                }
            ]
        else:
            data = []
            data_range_list = list(set(role_queryset))
            for item in data_range_list:
                if item == 0:
                    data = [{
                        "value": 0,
                        "label": '仅本人数据权限'
                    }]
                elif item == 1:
                    data = [{
                        "value": 0,
                        "label": '仅本人数据权限'
                    }, {
                        "value": 1,
                        "label": '本部门及以下数据权限'
                    },
                        {
                            "value": 2,
                            "label": '本部门数据权限'
                        }]
                elif item == 2:
                    data = [{
                        "value": 0,
                        "label": '仅本人数据权限'
                    },
                        {
                            "value": 2,
                            "label": '本部门数据权限'
                        }]
                elif item == 3:
                    data = [{
                        "value": 0,
                        "label": '仅本人数据权限'
                    },
                        {
                            "value": 3,
                            "label": '全部数据权限'
                        }, ]
                elif item == 4:
                    data = [{
                        "value": 0,
                        "label": '仅本人数据权限'
                    },
                        {
                            "value": 4,
                            "label": '自定义数据权限'
                        }]
                else:
                    data = []
        return DetailResponse(data=data)

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def data_scope_dept(self,request):
        """根据当前角色获取部门信息"""
        is_superuser = request.user.is_superuser
        if is_superuser:
            queryset = Dept.objects.values('id','name','parent')
        else:
            dept_list = request.user.role.values_list('dept',flat=True)
            queryset = Dept.objects.filter(id__in=dept_list).values('id','name','parent')
        return DetailResponse(data=queryset)

    @action(methods=['POST'], detail=True, permission_classes=[IsAuthenticated])
    def copy_role(self, request, pk=None):
        """复制角色"""
        source_role = self.get_object()
        new_name = request.data.get('name', '')
        new_key = request.data.get('key', '')
        new_admin = request.data.get('admin', False)

        if not new_name:
            return ErrorResponse(msg="新角色名称不能为空")
        if not new_key:
            return ErrorResponse(msg="新角色权限字符不能为空")
        if Role.objects.filter(name=new_name).exists():
            return ErrorResponse(msg=f"角色名称'{new_name}'已存在，请修改后重试")
        if Role.objects.filter(key=new_key).exists():
            return ErrorResponse(msg=f"权限字符'{new_key}'已存在，请修改后重试")

        with transaction.atomic():
            new_role = Role.objects.create(
                name=new_name,
                key=new_key,
                sort=request.data.get('sort', source_role.sort),
                status=request.data.get('status', source_role.status),
                admin=new_admin,
                data_range=request.data.get('data_range', source_role.data_range),
                remark=request.data.get('remark', source_role.remark),
                creator=request.user,
            )
            # 复制关联菜单
            new_role.menu.set(source_role.menu.all())
            # 复制关联按钮权限
            new_role.permission.set(source_role.permission.all())
            # 复制数据权限-关联部门
            new_role.dept.set(source_role.dept.all())

        serializer = RoleSerializer(new_role)
        return DetailResponse(data=serializer.data, msg="复制成功")