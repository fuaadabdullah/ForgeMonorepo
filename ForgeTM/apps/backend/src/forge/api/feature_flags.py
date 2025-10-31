from fastapi import APIRouter

router = APIRouter()


@router.get('/feature-flags')
async def get_feature_flags() -> dict[str, bool]:
    """Get the current feature flags configuration."""
    return {
        'enableStreaming': True,
        'enableCaching': True,
        'enableLogging': True,
        'enableTracing': True,
    }
