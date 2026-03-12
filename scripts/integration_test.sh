#!/bin/bash
# scripts/integration_test.sh
set -e

API_URL=${1:-"http://localhost:4000"}
EMAIL="testuser_$(date +%s)@example.com"
PASSWORD="PassWord123"

echo "=== Career Path Generator Integration Test ==="

echo "[1/4] Registering new user: $EMAIL"
curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
echo ""

echo -e "\n[2/4] Logging in to retrieve JWT..."
LOGIN_RES=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | grep -o '[^"]*$' || true)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token! Response: $LOGIN_RES"
  exit 1
fi
echo "Successfully logged in."

echo -e "\n[3/4] Creating profile using the token..."
PROFILE_RES=$(curl -s -X POST "$API_URL/api/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fullName": "Test User", "age": 30, "gender": "Male", "locationCity": "Mumbai", "locationState": "Maharashtra",
    "highestDegree": "B.Tech", "fieldOfStudy": "Computer Science", "institutionTier": "Tier 1",
    "currentRole": "Software Engineer", "currentIndustry": "IT", "yearsOfExperience": 5, "employmentStatus": "Employed Full-Time", "currentSalaryLpa": 15,
    "technicalSkills": ["JavaScript", "Python"], "softSkills": ["Communication"], "certifications": [],
    "interestDomains": ["AI", "EdTech"], "careerGoal": "Transition to Tech Lead", "preferredWorkStyle": "Remote",
    "willingToRelocate": false, "targetTimelineYears": 2, "lifeStage": "Mid Career", "burnoutLevel": 5,
    "stressTolerance": 7, "hasDependents": false, "recentLifeEvent": "None", "workLifePriority": "Career Growth",
    "leadershipScore": 7, "alignmentCategory": "Moderate"
  }')

PROFILE_ID=$(echo $PROFILE_RES | grep -o '"id":"[^"]*' | grep -o '[^"]*$' || true)

if [ -z "$PROFILE_ID" ]; then
  echo "Failed to create profile! Response: $PROFILE_RES"
  exit 1
fi
echo "Profile generated with ID: $PROFILE_ID"

echo -e "\n[4/4] Triggering Roadmap Generation... (May take 15-30s)"
curl -s -X POST "$API_URL/api/roadmap/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"profileId\":\"$PROFILE_ID\"}"

echo -e "\n\n=== Integration Test Complete ==="
