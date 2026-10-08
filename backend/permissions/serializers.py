from rest_framework import serializers
from .models import Function


class FunctionSerializer(serializers.ModelSerializer):
    """Serializer representing fine-grained Function entity."""
    class Meta:
        model = Function
        fields = ('id', 'name', 'code', 'description')
        read_only_fields = ('id', 'name', 'code', 'description')


class PermissionCodesSerializer(serializers.Serializer):
    """
    Validates function_codes provided in request body.
    Normalizes codes to uppercase and ensures all referenced functions exist.
    Does NOT create new Function records.
    """
    function_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        help_text="List of function codes to add or remove"
    )

    def validate_function_codes(self, value):
        if not value:
            raise serializers.ValidationError("At least one function code must be provided.")

        normalized_codes = [code.strip().upper() for code in value if code and code.strip()]
        if not normalized_codes:
            raise serializers.ValidationError("Function codes cannot be empty.")

        # Find matching Function entities in the database
        functions = list(Function.objects.filter(code__in=normalized_codes))
        found_codes = {f.code for f in functions}
        missing_codes = set(normalized_codes) - found_codes

        if missing_codes:
            raise serializers.ValidationError(
                f"Unknown function code(s): {', '.join(sorted(missing_codes))}."
            )

        return functions
