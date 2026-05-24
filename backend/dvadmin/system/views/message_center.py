# -*- coding: utf-8 -*-

from django_restql.fields import DynamicSerializerMethodField
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from application.websocketConfig import websocket_push
from dvadmin.system.models import MessageCenter, Users, MessageCenterTargetUser
from dvadmin.utils.json_response import SuccessResponse, DetailResponse
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet


class MessageCenterSerializer(CustomModelSerializer):
    """
    消息中心-序列化器
    """
    role_info = DynamicSerializerMethodField()
    user_info = DynamicSerializerMethodField()
    dept_info = DynamicSerializerMethodField()
    is_read = serializers.BooleanField(read_only=True, source='target_user__is_read')

    def get_role_info(self, instance, parsed_query):
        roles = instance.target_role.all()
        from dvadmin.system.views.role import RoleSerializer
        serializer = RoleSerializer(
            roles,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    def get_user_info(self, instance, parsed_query):
        users = instance.target_user.all()
        from dvadmin.system.views.user import UserSerializer
        serializer = UserSerializer(
            users,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    def get_dept_info(self, instance, parsed_query):
        dept = instance.target_dept.all()
        from dvadmin.system.views.dept import DeptSerializer
        serializer = DeptSerializer(
            dept,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    class Meta:
        model = MessageCenter
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterTargetUserSerializer(CustomModelSerializer):
    """
    目标用户序列化器-序列化器
    """

    class Meta:
        model = MessageCenterTargetUser
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterTargetUserListSerializer(CustomModelSerializer):
    """
    目标用户序列化器-序列化器
    """
    is_read = serializers.SerializerMethodField()

    def get_is_read(self, instance):
        user_id = self.request.user.id
        message_center_id = instance.id
        queryset = MessageCenterTargetUser.objects.filter(messagecenter__id=message_center_id, users_id=user_id).first()
        if queryset:
            return queryset.is_read
        return False

    class Meta:
        model = MessageCenter
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterCreateSerializer(CustomModelSerializer):
    """
    消息中心-新增-序列化器
    """

    @staticmethod
    def _dedupe_user_ids(user_ids):
        return list(dict.fromkeys(int(user_id) for user_id in user_ids))

    def _get_target_user_ids(self, target_type, initial_data):
        if target_type == 1:
            target_role = initial_data.get('target_role', [])
            queryset = Users.objects.filter(role__id__in=target_role).values_list('id', flat=True)
            return self._dedupe_user_ids(queryset)
        if target_type == 2:
            target_dept = initial_data.get('target_dept', [])
            queryset = Users.objects.filter(dept__id__in=target_dept).values_list('id', flat=True)
            return self._dedupe_user_ids(queryset)
        if target_type == 3:
            queryset = Users.objects.values_list('id', flat=True)
            return self._dedupe_user_ids(queryset)
        return self._dedupe_user_ids(initial_data.get('target_user', []))

    @staticmethod
    def _push_message_notification(target_type, user_ids):
        if not user_ids:
            return
        message = {
            "sender": 'system',
            "contentType": 'SYSTEM',
            "content": '您有一条新消息~',
            "refresh_unread": True
        }
        if target_type == 3:
            websocket_push("dvadmin", message=message)
            return
        for user_id in user_ids:
            websocket_push(f"user_{user_id}", message=message)

    def save(self, **kwargs):
        data = super().save(**kwargs)
        initial_data = self.initial_data
        target_type = int(initial_data.get('target_type', 0))
        user_ids = self._get_target_user_ids(target_type, initial_data)
        targetuser_data = [
            {
                "messagecenter": data.id,
                "users": user_id
            }
            for user_id in user_ids
        ]
        if targetuser_data:
            targetuser_instance = MessageCenterTargetUserSerializer(data=targetuser_data, many=True, request=self.request)
            targetuser_instance.is_valid(raise_exception=True)
            targetuser_instance.save()
        self._push_message_notification(target_type, user_ids)
        return data

    class Meta:
        model = MessageCenter
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterViewSet(CustomModelViewSet):
    """
    消息中心接口
    list:查询
    create:新增
    update:修改
    retrieve:单例
    destroy:删除
    """
    queryset = MessageCenter.objects.order_by('create_datetime')
    serializer_class = MessageCenterSerializer
    create_serializer_class = MessageCenterCreateSerializer
    extra_filter_backends = []

    def get_queryset(self):
        if self.action == 'list':
            return MessageCenter.objects.filter(creator=self.request.user.id).all()
        return MessageCenter.objects.all()

    def retrieve(self, request, *args, **kwargs):
        """
        重写查看
        """
        pk = kwargs.get('pk')
        user_id = self.request.user.id
        unread_queryset = MessageCenterTargetUser.objects.filter(users__id=user_id, messagecenter__id=pk).first()
        unread_changed = False
        if unread_queryset and not unread_queryset.is_read:
            unread_queryset.is_read = True
            unread_queryset.save()
            unread_changed = True
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        if unread_changed:
            websocket_push(
                f"user_{user_id}",
                message={
                    "sender": 'system',
                    "contentType": 'TEXT',
                    "content": '您查看了一条消息~',
                    "refresh_unread": True,
                    "skipNotify": True
                }
            )
        return DetailResponse(data=serializer.data, msg="获取成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_self_receive(self, request):
        """
        获取接收到的消息
        """
        self_user_id = self.request.user.id
        queryset = MessageCenter.objects.filter(target_user__id=self_user_id)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MessageCenterTargetUserListSerializer(page, many=True, request=request)
            return self.get_paginated_response(serializer.data)
        serializer = MessageCenterTargetUserListSerializer(queryset, many=True, request=request)
        return SuccessResponse(data=serializer.data, msg="获取成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_newest_msg(self, request):
        """
        获取最新的一条消息
        """
        self_user_id = self.request.user.id
        queryset = MessageCenterTargetUser.objects.filter(users__id=self_user_id).order_by('create_datetime').last()
        data = None
        if queryset:
            serializer = MessageCenterTargetUserListSerializer(queryset.messagecenter, many=False, request=request)
            data = serializer.data
        return DetailResponse(data=data, msg="获取成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_unread_msg(self, request):
        """获取未读消息数量"""
        self_user_id = self.request.user.id
        count = MessageCenterTargetUser.objects.filter(users__id=self_user_id, is_read=False).count()
        return DetailResponse(data={"count": count}, msg="获取成功")
