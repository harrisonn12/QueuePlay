import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AccountSection } from './dashboard/AccountSection';
import { MembershipSection } from './dashboard/MembershipSection';
import { PerksSection } from './dashboard/PerksSection';
import { DashboardSection } from './dashboard/DashboardSection';

export const UserDashboard = () => {
    const { user, logout } = useAuth0();
    const [activeTab, setActiveTab] = useState('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'account', label: 'Account' },
        { id: 'membership', label: 'Membership' },
        { id: 'perks', label: 'Perks' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardSection user={user} />;
            case 'account':
                return <AccountSection user={user} />;
            case 'membership':
                return <MembershipSection />;
            case 'perks':
                return <PerksSection />;
            default:
                return <DashboardSection user={user} />;
        }
    };

    return (
        <div className='min-h-screen bg-gray-100'>
            <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
                {/* Header */}
                <div className='bg-white shadow'>
                    <div className='px-4 py-5 sm:px-6 flex justify-between items-center'>
                        <div className='flex items-center space-x-4'>
                            <img
                                src={user?.picture}
                                alt='Profile'
                                className='h-10 w-10 rounded-full'
                            />
                            <h1 className='text-2xl font-bold text-gray-900'>
                                Welcome, {user?.name}
                            </h1>
                        </div>
                        <button
                            onClick={() =>
                                logout({ returnTo: window.location.origin })
                            }
                            className='px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700'
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className='border-b border-gray-200 mt-6'>
                    <nav className='-mb-px flex space-x-8'>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                    ${
                                        activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className='mt-6'>{renderContent()}</div>
            </div>
        </div>
    );
};
