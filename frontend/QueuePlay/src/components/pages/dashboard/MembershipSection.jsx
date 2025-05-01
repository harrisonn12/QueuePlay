import { KeyIcon } from '@heroicons/react/24/solid';
import { useMembershipTiers } from '../../../hooks/useMembershipTiers';
import { MembershipCard } from '../../features/MembershipCard';
import { useAuth0 } from '@auth0/auth0-react';
import { usePriceFilter } from '../../../hooks/usePriceFilter';
import { useManagementSubscription as managementSubscription } from '../../../hooks/useManageSubscription';

export const MembershipSection = () => {
    const text = {
        membershipPlansSection: 'Membership Plans',
        membershipPlansDescription:
            'Choose the perfect plan for your gaming journey.',
        monthlyFilterButton: 'Monthly',
        yearlyFilterButton: 'Yearly',
        manageMembershipButton: 'Manage Membership',
        membershipLoadingText: 'Loading membership tiers...',
    };
    const { membershipTiers } = useMembershipTiers();
    const { user } = useAuth0();
    const { priceFilter, handleMonthlyFilter, handleYearlyFilter } =
        usePriceFilter();

    return (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    {text.membershipPlansSection}
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    {text.membershipPlansDescription}
                </p>
            </div>
            <div className='border-t border-gray-200'>
                <div className='px-4 py-5 sm:p-6'>
                    {/* Billing Toggle */}
                    <div className='flex justify-end mb-8'>
                        <div className='relative inline-flex rounded-lg p-1 bg-gray-100'>
                            <button
                                onClick={handleMonthlyFilter}
                                className={
                                    `relative text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md px-4 py-2 ` +
                                    (priceFilter === 'month'
                                        ? 'text-white bg-indigo-600'
                                        : 'text-gray-700 hover:text-gray-900')
                                }
                            >
                                {text.monthlyFilterButton}
                            </button>
                            <button
                                onClick={handleYearlyFilter}
                                className={
                                    `relative text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md px-4 py-2 ` +
                                    (priceFilter === 'year'
                                        ? 'text-white bg-indigo-600'
                                        : 'text-gray-700 hover:text-gray-900')
                                }
                            >
                                {text.yearlyFilterButton}
                            </button>
                        </div>
                    </div>

                    {/* Membership Cards */}
                    <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-4'>
                        {membershipTiers ? (
                            membershipTiers
                                .sort((a, b) => a.monthlyRate > b.monthlyRate)
                                .map((tier) => (
                                    <MembershipCard
                                        key={tier.tierID}
                                        tier={tier.tierID}
                                        name={tier.tierName}
                                        price={
                                            priceFilter === 'month'
                                                ? tier.monthlyRate
                                                : tier.yearlyRate
                                        }
                                        billFrequency={priceFilter}
                                        perks={tier.perks}
                                    />
                                ))
                        ) : (
                            <div className='col-span-full flex justify-center items-center py-12'>
                                <div className='flex flex-col items-center space-y-4'>
                                    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600'></div>
                                    <p className='text-sm font-medium text-gray-600'>
                                        {text.membershipLoadingText}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manage Subscription Button */}
                    {membershipTiers && (
                        <div className='mt-8 flex justify-center'>
                            <button
                                onClick={(event) =>
                                    managementSubscription(event, user)
                                }
                                className='relative inline-flex items-center px-6 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300'
                            >
                                <KeyIcon className='w-5 h-5 mr-2' />
                                {text.manageMembershipButton}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
