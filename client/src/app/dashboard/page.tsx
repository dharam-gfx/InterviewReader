'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// import Image from 'next/image';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  skills?: string[];
  currentCompany?: string;
  totalExperience?: number;
  isActive?: boolean;
  lastLoginAt?: string;
  loginCount?: number; // Now represents active sessions
  createdAt?: string;
  updatedAt?: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/user/profile', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data received:', userData.data); // Debug log
        setUser(userData.data);
      } else if (response.status === 401) {
        // Not authenticated, redirect to login
        router.push('/');
      } else {
        setError('Failed to fetch user data');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check for error in URL params (OAuth failure)
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      const errorMessages: { [key: string]: string } = {
        'oauth_failed': 'OAuth authentication failed. Please try again.',
        'no_code': 'OAuth authorization code missing. Please try again.',
        'login_failed': 'Login process failed. Please try again.',
        'invalid_input': 'Invalid input provided. Please try again.',
        'email_exists': 'Email already exists with different provider. Please use the original provider.',
        'validation_failed': 'User data validation failed. Please try again.',
        'unauthorized': 'Access denied. Please check your credentials.',
        'invalid_request': 'Invalid OAuth request. Please try again.'
      };
      setError(errorMessages[errorParam] || 'An unknown error occurred.');
      setLoading(false);
      return;
    }

    // Check for success message
    const loginParam = searchParams?.get('login');
    const providerParam = searchParams?.get('provider');
    if (loginParam === 'success') {
      console.log(`✅ Successfully logged in with ${providerParam || 'OAuth provider'}`);
    }

    // Fetch user data from backend
    fetchUserData();
  }, [searchParams, fetchUserData]);

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:3001/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        router.push('/');
      } else {
        setError('Logout failed');
      }
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Logout failed');
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/v1/user/logout-all-others', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Successfully logged out from all devices
        router.push('/?message=logged_out_all_devices');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to logout from all devices');
      }
    } catch (err) {
      console.error('Error during logout from all devices:', err);
      setError('Network error: Failed to logout from all devices');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutOthers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/auth/logout-others', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Successfully logged out from other devices, refresh user data
        await fetchUserData();
        // Show success message or update UI as needed
        console.log('✅ Logged out from other devices successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to logout from other devices');
      }
    } catch (err) {
      console.error('Error during logout from other devices:', err);
      setError('Network error: Failed to logout from other devices');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No user data found. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const getProviderInfo = () => {
    // Get provider from URL params when available (after login)
    const providerParam = searchParams?.get('provider');
    if (providerParam) {
      const providerMap: { [key: string]: { provider: string; icon: string } } = {
        google: { provider: 'Google', icon: '🔍' },
        github: { provider: 'GitHub', icon: '🐙' },
        linkedin: { provider: 'LinkedIn', icon: '💼' }
      };
      return providerMap[providerParam] || { provider: 'OAuth', icon: '🔐' };
    }
    
    // Default when no provider info available
    return { provider: 'OAuth', icon: '🔐' };
  };

  const providerInfo = getProviderInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Interview Reader</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                {/* {user.avatar && (
                  <Image
                    className="h-20 w-20 rounded-full mr-6"
                    src={user.avatar}
                    alt={user.name}
                    width={80}
                    height={80}
                  />
                )} */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Welcome, {user.name}!
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500">
                      Signed in with {providerInfo.icon} {providerInfo.provider}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OAuth Test Results */}
          <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">OAuth Test Results</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                  <span className="text-sm font-medium text-green-800">OAuth Flow</span>
                  <span className="text-sm text-green-600">✅ Successful</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                  <span className="text-sm font-medium text-green-800">User Authentication</span>
                  <span className="text-sm text-green-600">✅ Verified</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                  <span className="text-sm font-medium text-green-800">Session Management</span>
                  <span className="text-sm text-green-600">✅ Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                  <span className="text-sm font-medium text-green-800">Database Integration</span>
                  <span className="text-sm text-green-600">✅ Connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-sm text-gray-900">{providerInfo.provider}</dd>
                </div>
                {user.currentCompany && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.currentCompany}</dd>
                  </div>
                )}
                {user.totalExperience !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Experience</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.totalExperience} years</dd>
                  </div>
                )}
                {user.loginCount && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Active Sessions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.loginCount}</dd>
                  </div>
                )}
                {user.lastLoginAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(user.lastLoginAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
              
              {/* Skills Section */}
              {user.skills && user.skills.length > 0 && (
                <div className="mt-6">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Skills</dt>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, index) => (
                      <span
                        key={`skill-${skill}-${index}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Management */}
          <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleLogoutOthers()}
                    className="w-full sm:w-auto bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    Logout Others
                  </button>
                  <button
                    onClick={() => handleLogoutAllDevices()}
                    className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Logout from All Devices
                  </button>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><strong>Logout Others:</strong> Logs you out from all other devices (keeps current session)</p>
                  <p><strong>Logout All:</strong> Logs you out from all devices including this one</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
