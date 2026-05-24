# -*- coding: utf-8 -*-

from django.db.models import BooleanField, OuterRef, Subquery
from django.utils import timezone
from django_restql.fields import DynamicSerializerMethodField
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from application.websocketConfig import websocket_push
from dvadmin.system.models import MessageCenter, Users, MessageCenterTargetUser
from dvadmin.utils.json_response import SuccessResponse, DetailResponse, ErrorResponse
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
        current_user_is_read = getattr(instance, 'current_user_is_read', None)
        if current_user_is_read is not None:
            return current_user_is_read
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

    def save(self, **kwargs):
        data = super().save(**kwargs)
        initial_data = self.initial_data
        target_type = initial_data.get('target_type')
        users = initial_data.get('target_user', [])
        if target_type in [1]:
            target_role = initial_data.get('target_role', [])
            users = Users.objects.filter(role__id__in=target_role).values_list('id', flat=True)
        if target_type in [2]:
            target_dept = initial_data.get('target_dept', [])
            users = Users.objects.filter(dept__id__in=target_dept).values_list('id', flat=True)
        if target_type in [3]:
            users = Users.objects.values_list('id', flat=True)
            websocket_push("dvadmin", message={"sender": 'system', "contentType": 'SYSTEM',
                                               "content": '您有一条新消息~', "refresh_unread": True})
        targetuser_data = []
        for user in users:
            targetuser_data.append({
                "messagecenter": data.id,
                "users": user
            })
            if target_type in [1, 2]:
                room_name = f"user_{user}"
                websocket_push(room_name, message={"sender": 'system', "contentType": 'SYSTEM',
                                                   "content": '您有一条新消息~', "refresh_unread": True})
        targetuser_instance = MessageCenterTargetUserSerializer(data=targetuser_data, many=True, request=self.request)
        targetuser_instance.is_valid(raise_exception=True)
        targetuser_instance.save()
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

    def get_self_receive_queryset(self):
        user_id = self.request.user.id
        relation_queryset = MessageCenterTargetUser.objects.filter(users_id=user_id)
        status = self.request.query_params.get('status')
        if status == 'unread':
            relation_queryset = relation_queryset.filter(is_read=False)
        elif status == 'read':
            relation_queryset = relation_queryset.filter(is_read=True)
        current_user_relation = MessageCenterTargetUser.objects.filter(
            users_id=user_id,
            messagecenter_id=OuterRef('pk')
        ).values('is_read')[:1]
        queryset = MessageCenter.objects.filter(id__in=relation_queryset.values('messagecenter_id')).annotate(
            current_user_is_read=Subquery(current_user_relation, output_field=BooleanField())
        )
        title = self.request.query_params.get('title')
        if title:
            queryset = queryset.filter(title__icontains=title)
        return queryset.distinct()

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        user_id = self.request.user.id
        queryset = MessageCenterTargetUser.objects.filter(users__id=user_id, messagecenter__id=pk).first()
        if queryset and not queryset.is_read:
            queryset.is_read = True
            queryset.save()
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        room_name = f"user_{user_id}"
        websocket_push(room_name, message={"sender": 'system', "contentType": 'TEXT',
                                           "content": '您查看了一条消息~', "refresh_unread": True})
        return DetailResponse(data=serializer.data, msg="获取成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_self_receive(self, request):
        self_user_queryset = self.get_self_receive_queryset()
        page = self.paginate_queryset(self_user_queryset)
        if page is not None:
            serializer = MessageCenterTargetUserListSerializer(page, many=True, request=request)
            return self.get_paginated_response(serializer.data)
        serializer = MessageCenterTargetUserListSerializer(self_user_queryset, many=True, request=request)
        return SuccessResponse(data=serializer.data, msg="获取成功")

    @action(methods=['POST'], detail=False, permission_classes=[IsAuthenticated])
    def mark_self_receive_read(self, request):
        message_ids = request.data.get('ids') or []
        if not isinstance(message_ids, list):
            message_ids = [message_ids]
        message_ids = [message_id for message_id in message_ids if message_id not in [None, '']]
        if not message_ids:
            return ErrorResponse(msg="请先选择消息")
        updated_count = MessageCenterTargetUser.objects.filter(
            users_id=request.user.id,
            messagecenter_id__in=message_ids,
            is_read=False
        ).update(is_read=True, update_datetime=timezone.now())
        return DetailResponse(data={"updated_count": updated_count}, msg="标记已读成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_newest_msg(self, request):
        self_user_id = self.request.user.id
        queryset = MessageCenterTargetUser.objects.filter(users__id=self_user_id).order_by('create_datetime').last()
        data = None
        if queryset:
            serializer = MessageCenterTargetUserListSerializer(queryset.messagecenter, many=False, request=request)
            data = serializer.data
        return DetailResponse(data=data, msg="获取成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_unread_msg(self, request):
        self_user_id = self.request.user.id
        count = MessageCenterTargetUser.objects.filter(users__id=self_user_id, is_read=False).count()
        return DetailResponse(data={"count": count}, msg="获取成功")
