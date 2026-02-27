# Client Pages Documentation

## Overview
All client pages are built with React + Tailwind CSS, featuring a dark modern theme, mobile responsiveness, and smooth animations. All API calls use Axios with secure JWT token storage.

## Pages Created

### 1. **Login** (`/login`)
- Email/password authentication
- JWT token storage
- Smooth form animations
- Mobile responsive
- Dark theme with neon accents

### 2. **Register** (`/register`)
- User registration form
- Password strength validation
- Auto-login after registration
- Smooth animations
- Mobile responsive

### 3. **Dashboard** (`/dashboard`)
- User stats overview
- Recent selfies grid
- Quick upload button
- Link to full upload page
- Smooth card animations
- Mobile responsive grid

### 4. **Challenges** (`/challenges`)
- Active challenges list
- Challenge details
- Participation tracking
- Smooth animations
- Mobile responsive

### 5. **Upload Selfie** (`/upload`)
- Full-featured upload page
- Camera capture
- File selection
- Filter application
- AI scoring
- Smooth page transitions
- Mobile responsive

### 6. **Leaderboard** (`/leaderboard`)
- Top 100 users
- Top 3 podium display
- User's rank display
- Smooth table animations
- Mobile responsive table

### 7. **Community** (`/community`)
- Public selfies feed
- Like and comment functionality
- Smooth card animations
- Mobile responsive grid

## Technical Implementation

### Axios Integration

**File:** `client/lib/axios.ts`

- Centralized Axios instance
- Automatic JWT token injection
- Request/response interceptors
- Error handling (401 redirects to login)
- 30-second timeout

**Usage:**
```typescript
import { apiClient } from "@/lib/axios";

// GET request
const response = await apiClient.get("/leaderboard");
const data = response.data;

// POST request
const response = await apiClient.post("/auth/login", { email, password });
```

### JWT Token Storage

**Secure Storage:**
- Stored in `localStorage` with key `selfistar_token`
- Automatically added to all authenticated requests
- Removed on logout or 401 errors
- Auto-redirects to login on token expiration

**Token Management:**
```typescript
import { tokenStorage } from "@/lib/axios";

tokenStorage.set(token);  // Store token
tokenStorage.get();        // Get token
tokenStorage.remove();     // Remove token
```

### Animations

**CSS Animations Added:**
- `animate-fade-in` - Fade in effect
- `animate-slide-up` - Slide up from bottom
- `animate-slide-down` - Slide down from top
- `animate-scale-in` - Scale in effect
- `animate-bounce-in` - Bounce in effect
- `transition-smooth` - Smooth transitions

**Usage:**
```tsx
<div className="animate-fade-in">
  Content fades in
</div>

<div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
  Content slides up with delay
</div>
```

### Dark Theme

**Color Scheme:**
- Background: Dark slate (`240 10% 6%`)
- Cards: Dark gray (`240 13% 13%`)
- Neon accents: Purple, Pink, Cyan
- Text: Light gray (`210 40% 98%`)

**Neon Colors:**
- `--neon-purple`: `280 100% 60%`
- `--neon-pink`: `320 100% 60%`
- `--neon-cyan`: `180 100% 50%`
- `--neon-lime`: `80 100% 50%`

### Mobile Responsiveness

**Breakpoints:**
- Mobile: `< 640px` (sm)
- Tablet: `640px - 1024px` (md)
- Desktop: `> 1024px` (lg)

**Responsive Patterns:**
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Padding: `p-4 md:p-6 lg:p-8`
- Text: `text-sm md:text-base lg:text-lg`
- Spacing: `space-y-4 md:space-y-6`

## API Integration

### Authentication
- **Login:** `POST /api/auth/login`
- **Register:** `POST /api/auth/register`
- **Get User:** `GET /api/auth/me`

### Selfies
- **Upload:** `POST /api/selfies/upload`
- **Get Mine:** `GET /api/selfies/mine`
- **Get Public:** `GET /api/selfies/public`
- **Delete:** `DELETE /api/selfies/:id`
- **Like:** `POST /api/selfies/:id/like`
- **Comment:** `POST /api/selfies/:id/comments`

### Challenges
- **List:** `GET /api/challenges`
- **Get All (Admin):** `GET /api/admin/challenges`
- **Create (Admin):** `POST /api/admin/challenges`
- **Update (Admin):** `PUT /api/admin/challenges/:id`
- **Delete (Admin):** `DELETE /api/admin/challenges/:id`

### Leaderboard
- **Get All:** `GET /api/leaderboard`
- **Get Top N:** `GET /api/leaderboard/top?limit=10`
- **Get My Rank:** `GET /api/leaderboard/me`

## Context Providers

### AuthContext
- User state management
- Login/register/logout functions
- Auto token refresh
- Protected route handling

### SelfieContext
- Selfie state management
- CRUD operations
- Stats calculations
- Public feed management

## Routing

**Routes defined in `App.tsx`:**
```typescript
<Route path="/" element={<Index />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/challenges" element={<Challenges />} />
<Route path="/leaderboard" element={<Leaderboard />} />
<Route path="/community" element={<Community />} />
<Route path="/upload" element={<UploadSelfie />} />
<Route path="/admin" element={<AdminDashboard />} />
```

## Performance Optimizations

1. **Lazy Loading:** Components load on demand
2. **Code Splitting:** Route-based code splitting
3. **Image Optimization:** Cloudinary CDN for images
4. **Caching:** API responses cached where appropriate
5. **Debouncing:** Form inputs debounced
6. **Memoization:** Expensive calculations memoized

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Screen reader friendly

## Security

- JWT tokens stored securely
- HTTPS required in production
- XSS protection
- CSRF protection (via SameSite cookies)
- Input validation
- Output sanitization
