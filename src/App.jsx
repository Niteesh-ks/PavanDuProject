import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ChromaticReveal } from './components/ChromaticReveal';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CampusRadarPage } from './pages/CampusRadarPage';
import { MomentsPage } from './pages/MomentsPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

// Global Styles
import './styles/index.css';
import './styles/components.css';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <div className="app-container">
              {/* Centre-Origin Full-Screen Chromatic Explosion Component */}
              <ChromaticReveal />

              {/* Navigation Header */}
              <Navbar />

              {/* Core Application Routes */}
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/radar" element={<CampusRadarPage />} />
                <Route path="/moments" element={<MomentsPage />} />

                {/* Protected Student Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Organizer Hub */}
                <Route
                  path="/organizer"
                  element={
                    <RoleRoute allowedRoles={['ORGANIZER']}>
                      <OrganizerDashboard />
                    </RoleRoute>
                  }
                />

                {/* Protected Admin Desk */}
                <Route
                  path="/admin"
                  element={
                    <RoleRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </RoleRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* Footer */}
              <Footer />
            </div>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
