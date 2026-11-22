import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import FindHousePage from './pages/FindHousePage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import DiscoverPage from './pages/DiscoverPage';
import CommunityPage from './pages/CommunityPage';
import { PolicyPage } from './pages/PolicyPage';
import {
  ForgotPasswordPage,
  GetStartedPage,
  HostApplyPage,
  LoginPage,
  ResetPasswordPage,
  StudentRegisterPage,
} from './pages/AuthPages';
import {
  AccountSettingsPage,
  StudentDashboardPage,
  StudentEnquiriesPage,
  StudentProfilePage,
  StudentSavedPage,
  StudentViewingsPage,
} from './pages/StudentWorkspace';
import {
  HostDashboardPage,
  HostEnquiriesPage,
  HostProfilePage,
  HostPropertiesListPage,
  HostViewingsPage,
  PropertyEditorPage,
  PropertyManagePage,
} from './pages/HostWorkspace';
import { CaretakerDashboardPage, CaretakerPropertiesPage } from './pages/CaretakerWorkspace';
import { MessagesPage, NotificationsPage } from './pages/CommunicationPages';
import {
  AdminApplicationsPage,
  AdminAuditLogsPage,
  AdminDashboardPage,
  AdminModerationPage,
  AdminPropertiesPage,
  AdminSettingsPage,
  AdminUsersPage,
} from './pages/AdminWorkspace';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/find-a-house" element={<FindHousePage />} />
          <Route path="/properties/:id" element={<PropertyDetailsPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<StudentRegisterPage />} />
          <Route path="/apply-host" element={<HostApplyPage />} />
          <Route path="/policies/host-terms" element={<PolicyPage documentType="host_terms" />} />
          <Route path="/policies/community-standards" element={<PolicyPage documentType="community_standards" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Shared Authenticated Communication */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Student Workspace */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student', 'owner', 'caretaker', 'admin']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/saved"
            element={
              <ProtectedRoute>
                <StudentSavedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/enquiries"
            element={
              <ProtectedRoute>
                <StudentEnquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/viewings"
            element={
              <ProtectedRoute>
                <StudentViewingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/settings"
            element={
              <ProtectedRoute>
                <AccountSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Property Owner Workspace */}
          <Route
            path="/host"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <HostDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/properties"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <HostPropertiesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/properties/new"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <PropertyEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/properties/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <PropertyEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/properties/:id/manage"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <PropertyManagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/enquiries"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <HostEnquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/viewings"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <HostViewingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/profile"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <HostProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/settings"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <AccountSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Resident Caretaker Workspace */}
          <Route
            path="/caretaker"
            element={
              <ProtectedRoute allowedRoles={['caretaker', 'admin']}>
                <CaretakerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/properties"
            element={
              <ProtectedRoute allowedRoles={['caretaker', 'admin']}>
                <CaretakerPropertiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/properties/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['caretaker', 'admin']}>
                <PropertyEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/enquiries"
            element={
              <ProtectedRoute allowedRoles={['caretaker', 'admin']}>
                <HostEnquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/viewings"
            element={
              <ProtectedRoute allowedRoles={['caretaker', 'admin']}>
                <HostViewingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/profile"
            element={
              <ProtectedRoute allowedRoles={['caretaker', 'admin']}>
                <HostProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Administrator Workspace */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/properties"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPropertiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/moderation"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminModerationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
