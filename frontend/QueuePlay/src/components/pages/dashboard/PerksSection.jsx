export const PerksSection = () => {

    const text = {
        perksRewardsSection: 'Your Perks & Rewards',
        perksRewardsDescription:
            'Explore and claim your exclusive member benefits.',
    };
    const perks = [
        {
            title: 'Daily Rewards',
            description:
                'Claim your daily rewards to earn points and exclusive items',
            status: 'Available',
            action: 'Claim Now',
        },
        {
            title: 'Special Events',
            description: 'Participate in special events for unique rewards',
            status: 'Upcoming',
            action: 'Learn More',
        },
    ];

    return (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    {text.perksRewardsSection}
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    {text.perksRewardsDescription}
                </p>
            </div>
            <div className='border-t border-gray-200'>
                <div className='px-4 py-5 sm:p-6'>
                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                        {perks.map((perk, index) => (
                            <div
                                key={index}
                                className='bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200'
                            >
                                <div className='px-4 py-5 sm:px-6'>
                                    <h4 className='text-lg font-medium text-gray-900'>
                                        {perk.title}
                                    </h4>
                                    <p className='mt-1 text-sm text-gray-500'>
                                        {perk.description}
                                    </p>
                                </div>
                                <div className='px-4 py-4 sm:px-6'>
                                    <div className='flex items-center justify-between'>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${
                                                perk.status === 'Available'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}
                                        >
                                            {perk.status}
                                        </span>
                                        <button className='inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700'>
                                            {perk.action}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
