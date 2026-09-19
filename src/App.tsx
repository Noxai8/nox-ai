import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Deployment refresh: 2026-09-19
import { AuthProvider, useAuth } from './lib/AuthContext';
import './styles/globals.css';

const Landing = lazy(() => import('./pages/Landing'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const GenerateProgram = lazy(() => import('./pages/GenerateProgram'));
const Home = lazy(() => import('./pages/Home'));
const Training = lazy(() => import('./pages/Training'));
const Program = lazy(() => import('./pages/Program'));
const Body = lazy(() => import('./pages/Body'));
const Coach = lazy(() => import('./pages/Coach'));
const Fuel = lazy(() => import('./pages/Fuel'));
const Play = lazy(() => import('./pages/Play'));
const NoxFuture = lazy(() => import('./pages/NoxFuture'));
const WeeklyReview = lazy(() => import('./pages/WeeklyReview'));
const Settings = lazy(() => import('./pages/Settings'));
const Subscribe = lazy(() => import('./pages/Subscribe'));
const RestDay = lazy(() => import('./pages/RestDay'));
const Partner = lazy(() => import('./pages/Partner'));
const Recovery = lazy(() => import('./pages/Recovery'));
const ShareTimeline = lazy(() => import('./pages/ShareTimeline'));
const BeginnerCalibration = lazy(() => import('./pages/BeginnerCalibration'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const FuelAI = lazy(() => import('./pages/FuelAI'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const FastingTracker = lazy(() => import('./pages/FastingTracker'));
const MoodTracker = lazy(() => import('./pages/MoodTracker'));
const Recipes = lazy(() => import('./pages/Recipes'));
const MealPlanner = lazy(() => import('./pages/MealPlanner'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));
const FoodScan = lazy(() => import('./pages/FoodScan'));
const Reschedule = lazy(() => import('./pages/Reschedule'));
const ActivityHub = lazy(() => import('./pages/ActivityHub'));

const Loader = () => <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#0A0A0A', fontWeight: 950, letterSpacing: '.15em', fontSize: 18 }}>NOX<span style={{ color: '#B7FF00' }}>.</span></div></div>;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/generate-program" element={<ProtectedRoute><GenerateProgram /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/training/:sessionId" element={<ProtectedRoute><Training /></ProtectedRoute>} />
        <Route path="/program" element={<ProtectedRoute><Program /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><ActivityHub /></ProtectedRoute>} />
        <Route path="/body" element={<ProtectedRoute><Body /></ProtectedRoute>} />
        <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
        <Route path="/fuel" element={<ProtectedRoute><Fuel /></ProtectedRoute>} />
        <Route path="/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
        <Route path="/play" element={<ProtectedRoute><Play /></ProtectedRoute>} />
        <Route path="/future" element={<ProtectedRoute><NoxFuture /></ProtectedRoute>} />
        <Route path="/weekly-review" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
        <Route path="/rest-day" element={<ProtectedRoute><RestDay /></ProtectedRoute>} />
        <Route path="/partner" element={<ProtectedRoute><Partner /></ProtectedRoute>} />
        <Route path="/recovery" element={<ProtectedRoute><Recovery /></ProtectedRoute>} />
        <Route path="/reschedule" element={<ProtectedRoute><Reschedule /></ProtectedRoute>} />
        <Route path="/share-timeline" element={<ProtectedRoute><ShareTimeline /></ProtectedRoute>} />
        <Route path="/calibration" element={<ProtectedRoute><BeginnerCalibration /></ProtectedRoute>} />
        <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/fuel-ai" element={<ProtectedRoute><FuelAI /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/fasting" element={<ProtectedRoute><FastingTracker /></ProtectedRoute>} />
        <Route path="/mood" element={<ProtectedRoute><MoodTracker /></ProtectedRoute>} />
        <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
        <Route path="/meal-planner" element={<ProtectedRoute><MealPlanner /></ProtectedRoute>} />
        <Route path="/food-scan" element={<ProtectedRoute><FoodScan /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
