from app.core.config import settings
from app.voice.safety import assert_mutation_allowed


def test_confirmation_flag_follows_settings(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_confirm_mutations", True)
    blocked = assert_mutation_allowed(
        patient_verified=True,
        confirmation_received=False,
        confirm_required=settings.voice_confirm_mutations,
    )
    assert blocked is not None
    monkeypatch.setattr(settings, "voice_confirm_mutations", False)
    allowed = assert_mutation_allowed(
        patient_verified=True,
        confirmation_received=False,
        confirm_required=settings.voice_confirm_mutations,
    )
    assert allowed is None
