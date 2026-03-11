from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import (
    AmbassadorProfile,
    AvailabilityException,
    AvailabilityRule,
    KnowledgeDocument,
    Meeting,
    MeetingStatus,
    MeetingType,
    StudentProfile,
    User,
    UserRole,
)
from app.services.knowledge import KnowledgeService


TIMEZONE = ZoneInfo("America/Chicago")


DEMO_USERS = [
    {
        "name": "Aisha Patel",
        "email": "aisha.student@utdemo.ai",
        "role": UserRole.student,
        "student_profile": {
            "program_interest": "MSITM",
            "country": "India",
            "career_interests": ["Product management", "AI", "Consulting"],
            "goals": "Wants to learn about MSITM, internships, and student life at McCombs.",
        },
    },
    {
        "name": "Carlos Rivera",
        "email": "carlos.student@utdemo.ai",
        "role": UserRole.student,
        "student_profile": {
            "program_interest": "Computer Science",
            "country": "USA",
            "career_interests": ["Software engineering", "Startups"],
            "goals": "Interested in CS clubs, housing, and startup recruiting.",
        },
    },
    {
        "name": "Mei Lin",
        "email": "mei.student@utdemo.ai",
        "role": UserRole.student,
        "student_profile": {
            "program_interest": "MBA",
            "country": "China",
            "career_interests": ["Consulting", "Brand strategy"],
            "goals": "Looking for international student support and recruiting advice.",
        },
    },
    {"name": "Priya Narayanan", "email": "admin@utdemo.ai", "role": UserRole.admin},
    {
        "name": "Sana Irshad",
        "email": "sana.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "MSITM - McCombs School of Business",
            "major": "Information Technology & Management",
            "graduation_year": 2026,
            "bio": "Former Salesforce Technical Lead focused on product strategy and analytics.",
            "interests": ["Product management", "AI", "Consulting"],
            "career_background": "Salesforce Technical Lead",
            "linkedin": "https://linkedin.com/in/sanairshad",
            "location": "Austin",
            "country": "India",
            "meeting_types": ["virtual", "in_person"],
        },
    },
    {
        "name": "Jordan Wells",
        "email": "jordan.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "BBA - McCombs School of Business",
            "major": "Finance",
            "graduation_year": 2025,
            "bio": "Helps students navigate McCombs recruiting, clubs, and case competitions.",
            "interests": ["Finance", "Clubs", "Networking"],
            "career_background": "Investment Banking Intern",
            "linkedin": "https://linkedin.com/in/jordanwells",
            "location": "Austin",
            "country": "USA",
            "meeting_types": ["virtual", "in_person"],
        },
    },
    {
        "name": "Krutika Kurup",
        "email": "ananya.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "MSITM - McCombs School of Business",
            "major": "Business Analytics",
            "graduation_year": 2026,
            "bio": "Supports students interested in analytics, internships, and transitioning from engineering.",
            "interests": ["Analytics", "Internships", "Data science"],
            "career_background": "Data Analyst",
            "linkedin": "https://linkedin.com/in/ananyarao",
            "location": "Austin",
            "country": "India",
            "meeting_types": ["virtual"],
        },
    },
    {
        "name": "Lucia Fernandez",
        "email": "lucia.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "MBA - McCombs School of Business",
            "major": "Marketing",
            "graduation_year": 2026,
            "bio": "Happy to talk through case method learning, consulting prep, and campus community.",
            "interests": ["Consulting", "Marketing", "International students"],
            "career_background": "Brand Manager",
            "linkedin": "https://linkedin.com/in/luciafernandez",
            "location": "Austin",
            "country": "Mexico",
            "meeting_types": ["virtual", "in_person"],
        },
    },
    {
        "name": "Ethan Kim",
        "email": "ethan.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "Computer Science",
            "major": "Computer Science",
            "graduation_year": 2025,
            "bio": "Covers CS coursework, startup culture, and student orgs around software engineering.",
            "interests": ["Software engineering", "Startups", "Hackathons"],
            "career_background": "Software Engineer Intern",
            "linkedin": "https://linkedin.com/in/ethankim",
            "location": "Austin",
            "country": "USA",
            "meeting_types": ["virtual"],
        },
    },
    {
        "name": "Nia Thompson",
        "email": "nia.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "Public Policy",
            "major": "Public Affairs",
            "graduation_year": 2025,
            "bio": "Can help with campus resources, service organizations, and navigating Austin off campus.",
            "interests": ["Campus resources", "Service", "Community"],
            "career_background": "Policy Research Assistant",
            "linkedin": "https://linkedin.com/in/niathompson",
            "location": "Austin",
            "country": "USA",
            "meeting_types": ["virtual", "in_person"],
        },
    },
    {
        "name": "Abhilash Tripathy",
        "email": "rohan.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "MSITM - McCombs School of Business",
            "major": "Information Technology & Management",
            "graduation_year": 2025,
            "bio": "Focuses on international student transition, analytics electives, and Austin housing decisions.",
            "interests": ["International students", "Housing", "Analytics"],
            "career_background": "Solutions Consultant",
            "linkedin": "https://linkedin.com/in/rohanmalhotra",
            "location": "Austin",
            "country": "India",
            "meeting_types": ["virtual", "in_person"],
        },
    },
    {
        "name": "Grace Nguyen",
        "email": "grace.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "Advertising",
            "major": "Advertising",
            "graduation_year": 2025,
            "bio": "Talk to Grace about creative clubs, internships, and balancing campus leadership roles.",
            "interests": ["Marketing", "Clubs", "Internships"],
            "career_background": "Creative Strategist Intern",
            "linkedin": "https://linkedin.com/in/gracenguyen",
            "location": "Austin",
            "country": "USA",
            "meeting_types": ["virtual"],
        },
    },
    {
        "name": "Noah Edwards",
        "email": "noah.ambassador@utdemo.ai",
        "role": UserRole.ambassador,
        "ambassador_profile": {
            "program": "Mechanical Engineering",
            "major": "Mechanical Engineering",
            "graduation_year": 2026,
            "bio": "Available for engineering course planning, makerspaces, and internship prep.",
            "interests": ["Engineering", "Internships", "Clubs"],
            "career_background": "Manufacturing Engineering Intern",
            "linkedin": "https://linkedin.com/in/noahedwards",
            "location": "Austin",
            "country": "USA",
            "meeting_types": ["virtual", "in_person"],
        },
    },
]


DEMO_DOCS = [
    {
        "title": "MSITM Program Snapshot",
        "source": "UT Demo Guide",
        "content": "The MSITM program at McCombs combines analytics, technology strategy, and business foundations. Students often describe the workload as manageable but fast-paced, especially during group project weeks. Strong time management helps when balancing career events and coursework.",
    },
    {
        "title": "McCombs Clubs and Networking",
        "source": "UT Demo Guide",
        "content": "McCombs students commonly join consulting clubs, analytics organizations, and industry-specific groups. Club recruiting and case competitions are strong networking channels. Students who get involved early often build better peer and alumni connections.",
    },
    {
        "title": "Austin Housing Basics",
        "source": "UT Demo Guide",
        "content": "Popular housing options near campus include West Campus apartments, Riverside communities, and graduate housing options. Students usually compare rent, shuttle access, parking, and roommate flexibility before signing a lease.",
    },
    {
        "title": "International Student Transition",
        "source": "UT Demo Guide",
        "content": "International students often ask about visa timelines, course loads, and career fair preparation. It helps to connect with ambassadors who have navigated the same transition and can explain both campus resources and employer expectations.",
    },
    {
        "title": "Internship Search Timeline",
        "source": "UT Demo Guide",
        "content": "Many recruiting cycles for business and technology roles start early in the fall semester. Students who refresh resumes before classes begin and attend employer events within the first month often have stronger internship outcomes.",
    },
    {
        "title": "Campus Resource Overview",
        "source": "UT Demo Guide",
        "content": "UT Austin offers advising, career coaching, counseling resources, and identity-based student centers. New students benefit from mapping out which offices support academic planning, recruiting, and overall wellbeing.",
    },
    {
        "title": "MBA Case Method Expectations",
        "source": "UT Demo Guide",
        "content": "MBA students should expect discussion-driven classes and significant teamwork. Class preparation matters because participation shapes the learning experience and helps students practice decision-making under uncertainty.",
    },
    {
        "title": "Computer Science Student Orgs",
        "source": "UT Demo Guide",
        "content": "Computer Science students often engage in hackathons, developer groups, and startup communities. These organizations create practical learning opportunities and help students meet peers interested in software engineering.",
    },
    {
        "title": "Living in West Campus",
        "source": "UT Demo Guide",
        "content": "West Campus is close to classes and student activity, but rent and noise levels vary significantly by building. Touring early and comparing lease terms can reduce housing surprises.",
    },
    {
        "title": "Graduate Student Networking Tips",
        "source": "UT Demo Guide",
        "content": "Graduate students often network through program events, coffee chats, club leadership, and alumni panels. Personalized outreach tends to work better than generic messages when building mentorship relationships.",
    },
    {
        "title": "Consulting Recruiting Advice",
        "source": "UT Demo Guide",
        "content": "Students targeting consulting roles should practice casing early, attend firm events, and work with second-year students or ambassadors who have been through recruiting. Structured preparation is more effective than cramming close to interviews.",
    },
    {
        "title": "Austin Internship Ecosystem",
        "source": "UT Demo Guide",
        "content": "Austin offers strong internship options across startups, major tech firms, consulting, and consumer brands. Students can use both school-hosted career tools and club communities to find role leads.",
    },
    {
        "title": "Campus Culture for New Students",
        "source": "UT Demo Guide",
        "content": "Campus culture feels large and energetic, so many students recommend joining one academic group and one social or service-oriented community early. That balance helps students feel connected faster.",
    },
    {
        "title": "Career Center Support",
        "source": "UT Demo Guide",
        "content": "Career services can support resume review, interview preparation, and employer research. The best results usually come from repeated visits rather than a single appointment close to deadlines.",
    },
    {
        "title": "Finding Ambassadors by Fit",
        "source": "UT Demo Guide",
        "content": "Students usually get the best mentorship experience when they choose ambassadors who match their program, interests, or international background. A strong fit makes conversations more specific and useful.",
    },
    {
        "title": "In-Person Mentorship Expectations",
        "source": "UT Demo Guide",
        "content": "In-person mentorship sessions work best when the meeting location is easy to find and relatively quiet, such as a coffee shop near campus or a student center common area.",
    },
]


def _next_weekday(target_weekday: int, hour: int) -> datetime:
    now = datetime.now(TIMEZONE)
    days_ahead = (target_weekday - now.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return (now + timedelta(days=days_ahead)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )


def seed_demo_data() -> None:
    knowledge_service = KnowledgeService()

    with SessionLocal() as db:
        existing_users = {user.email: user for user in db.scalars(select(User)).all()}
        user_lookup: dict[str, User] = {}

        for item in DEMO_USERS:
            user = existing_users.get(item["email"])
            if not user:
                user = User(name=item["name"], email=item["email"], role=item["role"])
                db.add(user)
                db.flush()
            else:
                user.name = item["name"]
                user.role = item["role"]

            if item["role"] == UserRole.student:
                profile = user.student_profile or StudentProfile(user_id=user.id)
                profile.program_interest = item["student_profile"]["program_interest"]
                profile.country = item["student_profile"]["country"]
                profile.career_interests = item["student_profile"]["career_interests"]
                profile.goals = item["student_profile"]["goals"]
                db.add(profile)

            if item["role"] == UserRole.ambassador:
                profile = user.ambassador_profile or AmbassadorProfile(user_id=user.id)
                for key, value in item["ambassador_profile"].items():
                    setattr(profile, key, value)
                db.add(profile)

            user_lookup[item["email"]] = user

        db.commit()

        ambassadors = db.scalars(select(User).where(User.role == UserRole.ambassador)).all()
        for ambassador in ambassadors:
            rules = db.scalars(
                select(AvailabilityRule).where(AvailabilityRule.ambassador_id == ambassador.id)
            ).all()
            if not rules:
                db.add_all(
                    [
                        AvailabilityRule(
                            ambassador_id=ambassador.id,
                            day_of_week=1,
                            start_time=time(9, 0),
                            end_time=time(12, 0),
                        ),
                        AvailabilityRule(
                            ambassador_id=ambassador.id,
                            day_of_week=3,
                            start_time=time(13, 0),
                            end_time=time(17, 0),
                        ),
                    ]
                )

        db.commit()

        if not db.scalar(select(AvailabilityException.id).limit(1)):
            db.add(
                AvailabilityException(
                    ambassador_id=user_lookup["sana.ambassador@utdemo.ai"].id,
                    starts_at=_next_weekday(3, 14).astimezone(UTC),
                    ends_at=(_next_weekday(3, 14) + timedelta(minutes=60)).astimezone(UTC),
                    reason="Career fair prep",
                )
            )
            db.commit()

        if not db.scalar(select(Meeting.id).limit(1)):
            sana = user_lookup["sana.ambassador@utdemo.ai"]
            aisha = user_lookup["aisha.student@utdemo.ai"]
            rohan = user_lookup["rohan.ambassador@utdemo.ai"]
            carlos = user_lookup["carlos.student@utdemo.ai"]
            db.add_all(
                [
                    Meeting(
                        student_id=aisha.id,
                        ambassador_id=sana.id,
                        start_time=_next_weekday(1, 9).astimezone(UTC),
                        end_time=(_next_weekday(1, 9) + timedelta(minutes=30)).astimezone(UTC),
                        status=MeetingStatus.confirmed,
                        meeting_type=MeetingType.virtual,
                        meeting_link="https://demo.utambassador.ai/meet/seed-sana",
                        notes="Discuss MSITM class rigor and recruiting.",
                    ),
                    Meeting(
                        student_id=carlos.id,
                        ambassador_id=rohan.id,
                        start_time=_next_weekday(3, 13).astimezone(UTC),
                        end_time=(_next_weekday(3, 13) + timedelta(minutes=60)).astimezone(UTC),
                        status=MeetingStatus.pending,
                        meeting_type=MeetingType.in_person,
                        location="McCombs atrium",
                        notes="Talk through Austin housing tradeoffs.",
                    ),
                ]
            )
            db.commit()

        existing_titles = set(db.scalars(select(KnowledgeDocument.title)).all())
        for document in DEMO_DOCS:
            if document["title"] in existing_titles:
                continue
            knowledge_service.ingest_document(
                db=db,
                title=document["title"],
                content=document["content"],
                source=document["source"],
                created_by_user_id=user_lookup["admin@utdemo.ai"].id,
            )

    print("Seed complete.")


if __name__ == "__main__":
    seed_demo_data()




