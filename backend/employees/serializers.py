from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Employee
from accounts.serializers import UserSerializer

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer for Employee entity.
    Never exposes user passwords or sensitive credentials.
    """
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        required=False,
        allow_null=True,
        write_only=True,
        help_text="Optional ID of User to link to this employee"
    )

    class Meta:
        model = Employee
        fields = (
            'id',
            'employee_id',
            'first_name',
            'last_name',
            'email',
            'department',
            'job_title',
            'phone',
            'date_of_joining',
            'is_active',
            'user',
            'user_id',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'employee_id': {'required': True, 'allow_blank': False},
            'department': {'required': True, 'allow_blank': False},
            'job_title': {'required': True, 'allow_blank': False},
        }

    def validate_employee_id(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Employee ID cannot be blank.")
        value = value.strip()
        instance = getattr(self, 'instance', None)
        qs = Employee.objects.filter(employee_id__iexact=value)
        if instance:
            qs = qs.exclude(id=instance.id)
        if qs.exists():
            raise serializers.ValidationError("An employee with this Employee ID already exists.")
        return value

    def validate(self, attrs):
        user = attrs.get('user')
        instance = getattr(self, 'instance', None)
        if user:
            qs = Employee.objects.filter(user=user)
            if instance:
                qs = qs.exclude(id=instance.id)
            if qs.exists():
                raise serializers.ValidationError({
                    'user_id': "This user is already linked to an existing employee profile."
                })
        return attrs
