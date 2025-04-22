import useMembershipCards from '../../../hooks/useMembershipCards';
import { MembershipCards } from '../../features/MembershipCards';

export const MembershipSection = () => {
    const { membershipTiers } = useMembershipCards();

    return (
        <>
            <section class='bg-white dark:bg-gray-900'>
                <div class='container px-6 py-8 mx-auto'>
                    <div class='sm:flex sm:items-center sm:justify-between'>
                        <div>
                            <h2 class='text-2xl font-bold text-gray-800 lg:text-3xl dark:text-gray-100'>
                                Simple, transparent pricing
                            </h2>
                            <p class='mt-4 text-gray-500 dark:text-gray-400'>
                                No Contracts. No surorise fees.
                            </p>
                        </div>

                        <div class='overflow-hidden p-0.5 mt-6 border rounded-lg dark:border-gray-700'>
                            <div class='sm:-mx-0.5 flex'>
                                <button class=' focus:outline-none px-3 w-1/2 sm:w-auto py-1 sm:mx-0.5 text-white bg-blue-500 rounded-lg'>
                                    Monthly
                                </button>
                                <button class=' focus:outline-none px-3 w-1/2 sm:w-auto py-1 sm:mx-0.5 text-gray-800 dark:text-gray-200 dark:hover:bg-gray-800 bg-transparent rounded-lg hover:bg-gray-200'>
                                    Yearly
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class='grid gap-6 mt-16 -mx-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'>
                        <MembershipCards cardData={membershipTiers} />
                    </div>
                </div>
            </section>
        </>
    );
};
