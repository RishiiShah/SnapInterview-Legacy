UPDATE "User"
SET "onboardingCompany" = NULL
WHERE lower(trim("onboardingCompany")) = 'pornhub';

UPDATE "InterviewSession"
SET "company" = NULL
WHERE lower(trim("company")) = 'pornhub';
