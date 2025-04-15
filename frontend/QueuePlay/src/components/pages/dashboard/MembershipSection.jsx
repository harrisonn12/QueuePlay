export const MembershipSection = () => {
    const tiers = [
        {
            name: 'Free',
            price: '$0',
            period: 'month',
            features: [
                'Access to 1 game',
                'Basic customer support',
                'No rewards program',
                'Store ad experience',
            ],
            current: true,
        },
        {
            name: 'Basic',
            price: '$4.99',
            period: 'month',
            features: [
                'Access to basic games',
                'Standard customer support',
                'Basic rewards program',
                'Ad-supported experience',
            ],
            current: false,
        },
        {
            name: 'Premium',
            price: '$9.99',
            period: 'month',
            features: [
                'Everything in Basic, plus:',
                'Access to all games',
                'Priority customer support',
                'Enhanced rewards program',
                'Ad-free experience',
                'Exclusive member events',
            ],
            current: false,
        }
    ];

    return (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Membership Status
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    View and manage your membership details.
                </p>
            </div>
            <div className='border-t border-gray-200'>
                <div className='px-4 py-5 sm:p-6'>
                    <div className='bg-indigo-50 border-l-4 border-indigo-400 p-4'>
                        <div className='flex'>
                            <div className='flex-shrink-0'>
                                <svg
                                    className='h-5 w-5 text-indigo-400'
                                    viewBox='0 0 20 20'
                                    fill='currentColor'
                                >
                                    <path
                                        fillRule='evenodd'
                                        d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                                        clipRule='evenodd'
                                    />
                                </svg>
                            </div>
                            <div className='ml-3'>
                                <p className='text-sm text-indigo-700'>
                                    Your current membership plan:{' '}
                                    <span className='font-bold'>Free</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='mt-6'>
                        <h4 className='text-lg font-medium text-gray-900'>
                            Membership Benefits
                        </h4>
                        <ul className='mt-4 space-y-4'>
                            <li className='flex items-start'>
                                <div className='flex-shrink-0'>
                                    <svg
                                        className='h-6 w-6 text-green-400'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth='2'
                                            d='M5 13l4 4L19 7'
                                        />
                                    </svg>
                                </div>
                                <p className='ml-3 text-sm text-gray-700'>
                                    Unlimited access to all games
                                </p>
                            </li>
                            <li className='flex items-start'>
                                <div className='flex-shrink-0'>
                                    <svg
                                        className='h-6 w-6 text-green-400'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth='2'
                                            d='M5 13l4 4L19 7'
                                        />
                                    </svg>
                                </div>
                                <p className='ml-3 text-sm text-gray-700'>
                                    Priority customer support
                                </p>
                            </li>
                            <li className='flex items-start'>
                                <div className='flex-shrink-0'>
                                    <svg
                                        className='h-6 w-6 text-green-400'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth='2'
                                            d='M5 13l4 4L19 7'
                                        />
                                    </svg>
                                </div>
                                <p className='ml-3 text-sm text-gray-700'>
                                    Exclusive member-only events
                                </p>
                            </li>
                        </ul>
                    </div>

                    <div className='mt-6'>
                        <h4 className='text-lg font-medium text-gray-900'>
                            Billing Information
                        </h4>
                        <div className='mt-4'>
                            <p className='text-sm text-gray-500'>
                                Next billing date: May 1, 2024
                            </p>
                            <p className='text-sm text-gray-500'>
                                Amount: $0/month
                            </p>
                        </div>
                        <div className='mt-4 space-x-4'>
                            <button className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700'>
                                Update Payment Method
                            </button>
                            <button className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'>
                                View Billing History
                            </button>
                        </div>
                    </div>

                    {/* Membership Tiers Section */}
                    <div className='mt-12'>
                        <h4 className='text-lg font-medium text-gray-900'>
                            Membership Tiers
                        </h4>
                        <p className='mt-1 text-sm text-gray-500'>
                            Compare our different membership tiers and their
                            benefits.
                        </p>
                        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                            {tiers.map((tier) => (
                                <div
                                    key={tier.name}
                                    className={`relative rounded-lg border ${
                                        tier.current
                                            ? 'border-indigo-600 ring-2 ring-indigo-600'
                                            : 'border-gray-300'
                                    } p-6 shadow-sm flex flex-col`}
                                >
                                    {tier.current && (
                                        <span className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                                            <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800'>
                                                Current Plan
                                            </span>
                                        </span>
                                    )}
                                    <div className='flex-1'>
                                        <h3 className='text-xl font-semibold text-gray-900'>
                                            {tier.name}
                                        </h3>
                                        <p className='mt-4 flex items-baseline'>
                                            <span className='text-4xl font-extrabold tracking-tight text-gray-900'>
                                                {tier.price}
                                            </span>
                                            <span className='ml-1 text-xl font-semibold text-gray-500'>
                                                /{tier.period}
                                            </span>
                                        </p>
                                        <ul className='mt-6 space-y-4'>
                                            {tier.features.map((feature) => (
                                                <li
                                                    key={feature}
                                                    className='flex items-start'
                                                >
                                                    <div className='flex-shrink-0'>
                                                        <svg
                                                            className='h-5 w-5 text-green-400'
                                                            fill='none'
                                                            viewBox='0 0 24 24'
                                                            stroke='currentColor'
                                                        >
                                                            <path
                                                                strokeLinecap='round'
                                                                strokeLinejoin='round'
                                                                strokeWidth='2'
                                                                d='M5 13l4 4L19 7'
                                                            />
                                                        </svg>
                                                    </div>
                                                    <p className='ml-3 text-sm text-gray-700'>
                                                        {feature}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className='mt-8'>
                                        <button
                                            className={`w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                tier.current
                                                    ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500'
                                                    : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                                            }`}
                                        >
                                            {tier.current
                                                ? 'Current Plan'
                                                : tier.name === 'Free'
                                                ? 'Current Plan'
                                                : 'Upgrade'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
