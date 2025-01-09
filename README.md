# **Gym Class Scheduling System**

## **Project Overview**

The **Gym Class Scheduling System** is a comprehensive platform designed to streamline gym class management. It facilitates class scheduling, booking management, and user role administration. The system supports three user roles: Admin, Trainer, and Trainee, each with specific permissions and capabilities.

## **Key Features**

- Role-based authentication (Admin, Trainer, Trainee)
- Class schedule management
- Booking system with capacity limits
- User management
- Real-time schedule availability
- Pagination and filtering support

## **Technology Stack**

- **Backend Framework:** Node.js + Express.js
- **Language:** TypeScript
- **Database:** MongoDB with Prisma ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Date Handling:** Moment.js
- **API Documentation:** Postman

## **Relation Diagram**

The following diagram illustrates the relationships between the entities in the system:
[Relational Diagram](https://res.cloudinary.com/dujji3jzc/image/upload/v1736396003/gym_scheduler_tcxzrw.jpg)

## **Database Schema**

### User

```typescript
type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "TRAINER" | "TRAINEE";
  createdAt: Date;
  updatedAt: Date;
};
```

### ClassSchedule

```typescript
type ClassSchedule = {
  id: string;
  startTime: Date;
  endTime: Date;
  maxTrainees: number;
  trainerId: string;
  createdAt: Date;
  updatedAt: Date;
  trainer: User;
  bookings: Booking[];
};
```

### Booking

```typescript
type Booking = {
  id: string;
  traineeId: string;
  classScheduleId: string;
  createdAt: Date;
  updatedAt: Date;
  trainee: User;
  classSchedule: ClassSchedule;
};
```

## **API Endpoints**

### Authentication

| Method | Endpoint                   | Description          | Access        |
| ------ | -------------------------- | -------------------- | ------------- |
| POST   | `/auth/register`           | Register new user    | Public        |
| POST   | `/auth/trainer/register`   | Register new trainer | Admin         |
| POST   | `/auth/login`              | User login           | Public        |
| GET    | `/auth/users?role=ADMIN`   | Get all users        | Admin         |
| GET    | `/auth/users?role=TRAINER` | Get all trainers     | Admin         |
| GET    | `/auth/users?role=TRAINEE` | Get all trainees     | Admin         |
| GET    | `/auth/profile`            | Get user profile     | Authenticated |
| PUT    | `/auth/change-password`    | Update user password | Authenticated |
| PUT    | `/auth/update-profile`     | Update user profile  | Authenticated |
| PUT    | `/auth/trainer/:trainerId` | Update trainer       | Admin         |
| DELETE | `/auth/user/:userId`       | Delete user          | Admin         |
| GET    | `/auth/user/:userId`       | Get user by ID       | Admin         |
| GET    | `/auth/profile`            | Get user profile     | Authenticated |

### Schedules

| Method | Endpoint             | Description           | Access        |
| ------ | -------------------- | --------------------- | ------------- |
| POST   | `/schedules`         | Create new schedule   | Admin         |
| GET    | `/schedules`         | Get all schedules     | Authenticated |
| GET    | `/schedules/trainer` | Get trainer schedules | Trainer       |
| PUT    | `/schedules/:id`     | Update schedule       | Admin         |
| DELETE | `/schedules/:id`     | Delete schedule       | Admin         |

### Bookings

| Method | Endpoint                | Description         | Access  |
| ------ | ----------------------- | ------------------- | ------- |
| POST   | `/bookings`             | Create booking      | Trainee |
| GET    | `/bookings/my-bookings` | Get user's bookings | Trainee |
| DELETE | `/bookings/:bookingId`  | Cancel booking      | Trainee |

## **Business Rules**

### Schedule Management

- Maximum 5 class schedules per day
- Each class is exactly 2 hours long
- Cannot schedule classes in the past
- Cannot schedule overlapping classes for the same trainer

### Booking System

- Maximum 10 trainees per class
- Trainees cannot book overlapping classes
- Trainees can only cancel their own bookings
- Cannot book full classes

## **Response Format**

All API responses follow a consistent format:

```typescript
{
    success: boolean;
    statusCode: number;
    message: string;
    data?: any;
    meta?: {
        currentPage: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
```

## **Error Handling**

The system implements comprehensive error handling:

- Input validation errors
- Authentication/Authorization errors
- Business rule violations
- Database operation errors

## **Setup Instructions**

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation Steps

1. Clone the repository

```bash
git clone <repository-url>
cd backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables
   Create a `.env` file with:

```
DATABASE_URL="your-mongodb-url"
JWT_SECRET="your-jwt-secret"
PORT=5000
```

4. Run database migrations

```bash
npx prisma generate
npx prisma db push
```

5. Start the server

```bash
# Development
npm run dev

# Production
npm start
```

## **Development Guidelines**

- Use TypeScript for type safety
- Follow RESTful API conventions
- Implement proper error handling
- Use async/await for asynchronous operations
- Maintain consistent code formatting
- Document new endpoints and changes

## **Security Measures**

- JWT-based authentication
- Password hashing
- Role-based access control
- Request validation
- Error message sanitization

### **Postman Documentation**

https://documenter.getpostman.com/view/20773865/2sAYJAfy9b

in case of running on postman it will automatically attatach the token after login,
but if you want to use any other software, then you have to manually copy the token from the response
and attach it to the headers as `Authorization: Bearer <token>`

### **Live Hosting Link:**

https://gym-class-scheduling-backend.vercel.app/api

---

## **Admin Credentials**

- **Email:** kabir@gmail.com
- **Password:** 111111

## **Trainer Credentials**

- **Email:** sohan@gmail.com
- **Password:** 222222

## **Trainee Credentials**

- **Email:** chaudhuree@gmail.com
- **Password:** 333333

---

## **Some Dates for Creating Schedules**

```
    2025-01-19T04:00:00.000+00:00
    2025-01-19T06:00:00.000+00:00
    2025-01-19T08:00:00.000+00:00
    2025-01-19T10:00:00.000+00:00
    2025-01-19T12:00:00.000+00:00
    2025-01-19T14:00:00.000+00:00
    2025-01-19T16:00:00.000+00:00
```
