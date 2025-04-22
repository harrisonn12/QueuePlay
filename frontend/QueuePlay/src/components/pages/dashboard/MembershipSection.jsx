import useMembershipTiers from '../../../hooks/useMembershipTiers';
import { MembershipCards } from '../../features/MembershipCards';
import axios from 'axios';

export const MembershipSection = () => {
    const { membershipTiers } = useMembershipTiers();

    const handleManageSubscription = async () => {
        event.preventDefault();

        try {
            const response = await axios.post(
                'http://127.0.0.1:8000/paymentService/createCustomerPortalSession',
                {
                    customerID: 'cus_S718UIofINdTAG',
                    returnURL: 'http://localhost:5173/',
                }
            );

            window.location.href = response.data;
        } catch (e) {
            console.error(`Error creating customer portal session: `, e);
        }
    };

    return (
        <>
            <section className='bg-white dark:bg-gray-900'>
                <div className='container px-6 py-8 mx-auto'>
                    <div className='sm:flex sm:items-center sm:justify-between'>
                        <div>
                            <h2 className='text-2xl font-bold text-gray-800 lg:text-3xl dark:text-gray-100'>
                                Simple, transparent pricing
                            </h2>
                            <p className='mt-4 text-gray-500 dark:text-gray-400'>
                                No Contracts. No surorise fees.
                            </p>
                        </div>

                        <div className='overflow-hidden p-0.5 mt-6 border rounded-lg dark:border-gray-700'>
                            <div className='sm:-mx-0.5 flex'>
                                <button className=' focus:outline-none px-3 w-1/2 sm:w-auto py-1 sm:mx-0.5 text-white bg-blue-500 rounded-lg'>
                                    Monthly
                                </button>
                                <button className=' focus:outline-none px-3 w-1/2 sm:w-auto py-1 sm:mx-0.5 text-gray-800 dark:text-gray-200 dark:hover:bg-gray-800 bg-transparent rounded-lg hover:bg-gray-200'>
                                    Yearly
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className='grid gap-6 mt-16 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'>
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
                            <p>Loading tiers...</p>
                        )}
                    </div>
                    {membershipTiers ? (
                        <form onSubmit={handleManageSubscription}>
                            <button
                                className='w-full px-4 py-2 mt-10 font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600'
                                type='submit'
                            >
                                Manage your subscription
                            </button>
                        </form>
                    ) : (
                        ''
                    )}
                </div>
            </section>
        </>
    );
};
