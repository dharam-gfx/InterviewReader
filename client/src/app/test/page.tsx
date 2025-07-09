'use client';

import React, { useState, useEffect } from 'react';

const TestOAuth = () => {
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>( 'checking' );
    const [testResults, setTestResults] = useState<{
        serverHealth: boolean;
        envVars: boolean;
        routes: boolean;
    }>( {
        serverHealth: false,
        envVars: false,
        routes: false,
    } );

    useEffect( () => {
        checkServerStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [] );

    const checkServerStatus = async () => {
        try {
            // Test server health
            const healthResponse = await fetch( 'http://localhost:3001/', {
                method: 'GET',
                mode: 'cors',
            } );

            if ( healthResponse.ok ) {
                setServerStatus( 'online' );
                setTestResults( prev => ( { ...prev, serverHealth: true } ) );

                // Test auth routes
                await testAuthRoutes();
            } else {
                setServerStatus( 'offline' );
            }
        } catch ( error ) {
            console.error( 'Server check failed:', error );
            setServerStatus( 'offline' );
        }
    };

    const testAuthRoutes = async () => {
        const routes = ['google', 'github', 'linkedin'];
        let routesWorking = true;

        for ( const provider of routes ) {
            try {
                const response = await fetch( `http://localhost:3001/auth/${provider}`, {
                    method: 'GET',
                    mode: 'cors',
                    redirect: 'manual', // Don't follow redirects
                } );

                // OAuth endpoints should redirect (status 302 or similar)
                if ( response.status !== 0 && response.type !== 'opaqueredirect' ) {
                    routesWorking = false;
                    break;
                }
            } catch {
                routesWorking = false;
                break;
            }
        }

        setTestResults( prev => ( { ...prev, routes: routesWorking } ) );
    };

    const handleTestOAuth = ( provider: string ) => {
        // Open OAuth in a new tab for testing
        const newWindow = window.open(
            `http://localhost:3001/auth/${provider}`,
            '_blank',
            'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Monitor the popup for completion
        const timer = setInterval( () => {
            try {
                if ( newWindow?.closed ) {
                    clearInterval( timer );
                    // Refresh the test page to see if user is now logged in
                    window.location.reload();
                }
            } catch {
                // Cross-origin restrictions may cause errors, which is expected
            }
        }, 1000 );
    };

    const getStatusColor = ( status: boolean ) => {
        return status ? 'text-green-600' : 'text-red-600';
    };

    const getStatusIcon = ( status: boolean ) => {
        return status ? '✅' : '❌';
    };

    const getServerStatusColor = ( status: 'checking' | 'online' | 'offline' ) => {
        if ( status === 'online' ) return 'bg-green-500';
        if ( status === 'offline' ) return 'bg-red-500';
        return 'bg-yellow-500';
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h1 className="text-2xl font-bold text-gray-900">OAuth Testing Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Test your OAuth implementation with real providers
                        </p>
                    </div>

                    <div className="p-6">
                        {/* Server Status */}
                        <div className="mb-8">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Server Status</h2>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-3 ${getServerStatusColor( serverStatus )}`}></div>
                                    <span className="text-sm font-medium">
                                        Server: {serverStatus === 'checking' ? 'Checking...' : serverStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Test Results */}
                        <div className="mb-8">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">System Tests</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium">Server Health Check</span>
                                    <span className={`text-sm ${getStatusColor( testResults.serverHealth )}`}>
                                        {getStatusIcon( testResults.serverHealth )} {testResults.serverHealth ? 'Passed' : 'Failed'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium">Auth Routes Available</span>
                                    <span className={`text-sm ${getStatusColor( testResults.routes )}`}>
                                        {getStatusIcon( testResults.routes )} {testResults.routes ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* OAuth Provider Tests */}
                        <div className="mb-8">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">OAuth Provider Tests</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {/* Google OAuth */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center mb-3">
                                        <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <h3 className="font-medium">Google OAuth</h3>
                                    </div>
                                    <button
                                        onClick={() => handleTestOAuth( 'google' )}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                                        disabled={serverStatus !== 'online'}
                                    >
                                        Test Google Login
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Opens in new window for testing
                                    </p>
                                </div>

                                {/* GitHub OAuth */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center mb-3">
                                        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                        <h3 className="font-medium">GitHub OAuth</h3>
                                    </div>
                                    <button
                                        onClick={() => handleTestOAuth( 'github' )}
                                        className="w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                                        disabled={serverStatus !== 'online'}
                                    >
                                        Test GitHub Login
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Opens in new window for testing
                                    </p>
                                </div>

                                {/* LinkedIn OAuth */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center mb-3">
                                        <svg className="w-6 h-6 mr-2" fill="#0077b5" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                        <h3 className="font-medium">LinkedIn OAuth</h3>
                                    </div>
                                    <button
                                        onClick={() => handleTestOAuth( 'linkedin' )}
                                        className="w-full bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800 transition-colors"
                                        disabled={serverStatus !== 'online'}
                                    >
                                        Test LinkedIn Login
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Opens in new window for testing
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Debug Information */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        <strong>Important:</strong> Make sure you have set up OAuth applications in the provider consoles and updated your .env file with real credentials.
                                    </p>
                                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                                        <li>Server should be running on localhost:3001</li>
                                        <li>Frontend should be running on localhost:3000</li>
                                        <li>OAuth redirect URIs should match your .env configuration</li>
                                        <li>Check browser console for any CORS or network errors</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestOAuth;
