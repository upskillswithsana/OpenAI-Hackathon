from datetime import UTC, datetime, timedelta

from app.models import MeetingStatus


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_upload_and_student_ask_flow(test_context):
    client = test_context["client"]
    admin_headers = auth_headers(test_context["tokens"]["admin"])
    student_headers = auth_headers(test_context["tokens"]["student"])

    upload = client.post(
        "/admin/knowledge/upload",
        headers=admin_headers,
        data={
            "title": "Housing Playbook",
            "source": "Test Upload",
            "content": "West Campus apartments are popular because they are close to class, but students should compare rent, noise, and roommate flexibility.",
        },
    )
    assert upload.status_code == 200
    assert upload.json()["chunk_count"] >= 1

    response = client.post(
        "/ai/ask",
        headers=student_headers,
        json={"question": "What housing options should I consider near campus?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["citations"]
    assert body["suggested_ambassadors"]
    assert "housing" in body["answer"].lower() or "campus" in body["answer"].lower()


def test_meeting_request_lifecycle_and_conflict_blocking(test_context):
    client = test_context["client"]
    student_headers = auth_headers(test_context["tokens"]["student"])
    ambassador_headers = auth_headers(test_context["tokens"]["sana"])
    ambassador_id = test_context["ids"]["sana"]
    timezone = test_context["timezone"]

    start_time = datetime(2026, 3, 10, 10, 0, tzinfo=timezone).astimezone(UTC)

    create = client.post(
        "/meetings",
        headers=student_headers,
        json={
            "ambassador_id": ambassador_id,
            "start_time": start_time.isoformat(),
            "duration_minutes": 30,
            "meeting_type": "virtual",
            "notes": "Want to understand MSITM workload.",
        },
    )
    assert create.status_code == 200
    meeting = create.json()
    assert meeting["status"] == MeetingStatus.pending.value

    duplicate = client.post(
        "/meetings",
        headers=student_headers,
        json={
            "ambassador_id": ambassador_id,
            "start_time": start_time.isoformat(),
            "duration_minutes": 30,
            "meeting_type": "virtual",
        },
    )
    assert duplicate.status_code == 409

    confirm = client.patch(
        f"/meetings/{meeting['id']}/status",
        headers=ambassador_headers,
        json={"status": "confirmed"},
    )
    assert confirm.status_code == 200
    confirmed = confirm.json()
    assert confirmed["status"] == MeetingStatus.confirmed.value
    assert confirmed["meeting_link"]

    cancel = client.patch(
        f"/meetings/{meeting['id']}/status",
        headers=student_headers,
        json={"status": "cancelled"},
    )
    assert cancel.status_code == 200
    assert cancel.json()["status"] == MeetingStatus.cancelled.value
