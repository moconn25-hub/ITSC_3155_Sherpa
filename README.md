# ITSC_3155_Sherpa

Create a Demo of educational roadmap generator app Sherpa

**Description:**\
A platform for UNCC CS students to create a roadmap of their progression through their courses,
test their skills, and network with other students, professors, and employers. Professors can login 
to create test questions to benchmark students. Employers can login to scout out students as well as 
create test questions.

**Instructions for installing dependencies:**

**Instructions for running the application locally:**\
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Generate Prisma Client with `npm run db:generate`.
4. Apply migrations with `npx prisma migrate deploy`.
5. Add the sample major, career, skill, and course data with `npm run seed`.
6. Start the app with `npm start` and open `http://localhost:3000`.

**Descriptions of the implemented features:**
- Sign in page\

**Sign-up page**\
The sign-up page creates persistent accounts through the local server. Students enter a major and career goal, then complete the six-question skill assessment; their account, profile, skills, and initial prerequisite-aware roadmap are saved together. Teachers and employers skip student-only details and do not receive roadmaps. Passwords are stored as salted scrypt hashes.

**Sign-in**\
Sign in with the email, password, and role used during sign-up. The server verifies the stored password hash and keeps the sign-in session in SQLite; student sign-in loads the existing roadmap and progress rather than generating a replacement. Sessions expire after seven days. The local demo binds only to `127.0.0.1`; production deployment requires HTTPS for secure session cookies.

**Roadmap data foundation**\
The Prisma schema contains course/skill relationships, prerequisite links, student skill assessments, and a persisted roadmap per student. The seed command adds illustrative sample courses aligned with the majors and career fields offered on the sign-up page. These sample courses are not official catalog entries or degree requirements.

The student major choices reflect UNC Charlotte College of Computing and Informatics undergraduate programs: Artificial Intelligence, Computer Science (B.A. and B.S.), Data Science, and Sports Analytics. See the [CCI undergraduate studies page](https://cci.charlotte.edu/academics/undergraduate-studies/) for the current official list.

**Instructions for testing the feature:**\
[Vitest](https://vitest.dev/guide/#community) has been used for automated testing.\
Run the sign-up, sign-in, and roadmap-ordering tests with `npm test -- --run src/auth/signup.test.js src/auth/signin.test.js src/roadmap/generate.test.js`.\
Create an account on the sign-up page, then use that role, email, and password to test sign-in. Seeded course data does not create user accounts.

SQLite was used due to it's easy of use and the ability to host a database locally.

AI usage: Copilot was used to generate code and minimal implementation plan 

