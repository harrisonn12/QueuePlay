import useMembershipTiers from '../../../hooks/useMembershipTiers';
import { MembershipCards } from '../../features/MembershipCards';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

export const MembershipSection = () => {
    const { membershipTiers } = useMembershipTiers();
    const { user } = useAuth0();

    const handleManageSubscription = async (event) => {
        event.preventDefault();

        try {
            const response = await axios.post(
                'http://127.0.0.1:8000/paymentService/createStripeCustomerPortalSession',
                {
                    auth0ID: user.sub,
                    returnURL: 'http://localhost:5173/',
                }
            );

            window.location.href = response.data.url;
        } catch (e) {
            console.error(`Error creating customer portal session: `, e);
        }
    };

    return (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Membership Plans
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Choose the perfect plan for your gaming journey.
                </p>
            </div>
            <div className='border-t border-gray-200'>
                <div className='px-4 py-5 sm:p-6'>
                    {/* Billing Toggle */}
                    <div className='flex justify-end mb-8'>
                        <div className='relative inline-flex rounded-lg p-1 bg-gray-100'>
                            <button className='relative px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'>
                                Monthly
                            </button>
                            <button className='relative px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none'>
                                Yearly
                            </button>
                        </div>
                    </div>

                    {/* Membership Cards */}
                    <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                        {membershipTiers ? (
                            membershipTiers.map((tier) => (
                                <MembershipCards
                                    key={tier.tierID}
                                    name={tier.tierName}
                                    price={tier.monthlyRate}
                                    perks={tier.perks}
                                />
                            ))
                        ) : (
                            <div className='col-span-full flex justify-center items-center py-12'>
                                <div className='flex flex-col items-center space-y-4'>
                                    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600'></div>
                                    <p className='text-sm font-medium text-gray-600'>
                                        Loading membership plans...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manage Subscription Button */}
                    {membershipTiers && (
                        <div className='mt-8 flex justify-center'>
                            <button
                                onClick={handleManageSubscription}
                                className='relative inline-flex items-center px-6 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300'
                            >
                                <svg
                                    className='w-5 h-5 mr-2'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth='2'
                                        d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                                    />
                                </svg>
                                Manage Subscription
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
