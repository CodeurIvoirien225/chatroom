# Chat Room Application

A multi-room chat application that allows users to connect based on their relationship intentions (friendship, dating, casual conversations, marriage).

## Features

- User authentication (signup/login)
- User profile creation and management
- Themed chat rooms for different relationship intentions
- Real-time messaging
- User search functionality
- Message reporting and moderation
- User blocking

## Tech Stack

- **Frontend**: React, TailwindCSS
- **Backend**: Node.js, Express
- **Database & Auth**: Supabase (Authentication, Real-time Database)

## Project Setup

### Prerequisites

- Node.js and npm installed
- Supabase account

### Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. In the Supabase dashboard, go to SQL Editor and run the following SQL to create the necessary tables:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    gender TEXT,
    age INTEGER,
    bio TEXT,
    interests TEXT[],
    location TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id)
);

-- Create rooms table
CREATE TABLE public.rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'friendship', 'dating', 'casual', 'marriage'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_count INTEGER DEFAULT 0
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users ON DELETE SET NULL,
    sender_username TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create room_participants table to track active users in rooms
CREATE TABLE public.room_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, user_id)
);

-- Create reports table for message moderation
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.messages ON DELETE CASCADE,
    reported_by UUID REFERENCES auth.users ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- Create user_blocks table
CREATE TABLE public.user_blocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    blocked_user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, blocked_user_id)
);

-- Insert initial chat rooms
INSERT INTO public.rooms (name, description, type) 
VALUES 
('Friendship Zone', 'Connect with people looking for meaningful friendships', 'friendship'),
('Dating Lounge', 'Chat with others interested in dating and relationships', 'dating'),
('Casual Conversations', 'Just looking to chat? This is your space', 'casual'),
('Marriage Minded', 'For those seeking a serious commitment and marriage', 'marriage');
```

3. Get your Supabase URL and anon key from the project settings (API section)

### Backend Setup

1. Navigate to the backend directory
   ```
   cd backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file and add your Supabase credentials

4. Start the backend server
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory
   ```
   cd ../
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Update the Supabase client in `src/lib/supabaseClient.js` with your Supabase URL and anon key

4. Start the frontend development server
   ```
   npm run dev
   ```

## Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   └── NavBar.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── pages/
│   │   ├── AuthPage.tsx
│   │   ├── RoomsPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── backend/
│   ├── index.js
│   ├── package.json
│   └── .env
├── package.json
└── README.md
```
