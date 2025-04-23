import { useState } from 'react';

export const DashboardSection = () => {
    const [isLaunching, setIsLaunching] = useState(false);

    const handleLaunchGame = () => {
        setIsLaunching(true);
        // Simulate game launch with a timeout
        setTimeout(() => {
            setIsLaunching(false);
            // Here you would actually launch the game
            console.log('Game launched!');
        }, 2000);
    };

    return (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Game Dashboard
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Your gaming hub and quick access to QueuePlay games.
                </p>
            </div>
            <div className='border-t border-gray-200'>
                <div className='px-4 py-5 sm:p-6'>
                    {/* Launch Game Button */}
                    <div className='flex flex-col items-center justify-center py-12'>
                        <div className='relative'>
                            <div
                                className={`absolute -inset-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 opacity-75 blur ${
                                    isLaunching ? 'animate-pulse' : ''
                                }`}
                            ></div>
                            <button
                                onClick={handleLaunchGame}
                                disabled={isLaunching}
                                className={`relative flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-indigo-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${
                                    isLaunching
                                        ? 'opacity-75 cursor-wait'
                                        : 'hover:bg-indigo-700'
                                }`}
                            >
                                {isLaunching ? (
                                    <>
                                        <svg
                                            className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                                            xmlns='http://www.w3.org/2000/svg'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                        >
                                            <circle
                                                className='opacity-25'
                                                cx='12'
                                                cy='12'
                                                r='10'
                                                stroke='currentColor'
                                                strokeWidth='4'
                                            ></circle>
                                            <path
                                                className='opacity-75'
                                                fill='currentColor'
                                                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                            ></path>
                                        </svg>
                                        Launching...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className='w-6 h-6 mr-2'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                            xmlns='http://www.w3.org/2000/svg'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth='2'
                                                d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
                                            ></path>
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth='2'
                                                d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                            ></path>
                                        </svg>
                                        Launch Game
                                    </>
                                )}
                            </button>
                        </div>
                        <p className='mt-4 text-sm text-gray-500'>
                            Click to launch your favorite QueuePlay game
                        </p>
                    </div>

                    {/* User Stats */}
                    <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2'>
                        <div className='bg-white overflow-hidden shadow rounded-lg'>
                            <div className='p-5'>
                                <div className='flex items-center'>
                                    <div className='flex-shrink-0'>
                                        <svg
                                            className='h-6 w-6 text-gray-400'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                            stroke='currentColor'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth='2'
                                                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                                            />
                                        </svg>
                                    </div>
                                    <div className='ml-5 w-0 flex-1'>
                                        <dl>
                                            <dt className='text-sm font-medium text-gray-500 truncate'>
                                                Time Played
                                            </dt>
                                            <dd className='flex items-baseline'>
                                                <div className='text-2xl font-semibold text-gray-900'>
                                                    42h
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='bg-white overflow-hidden shadow rounded-lg'>
                            <div className='p-5'>
                                <div className='flex items-center'>
                                    <div className='flex-shrink-0'>
                                        <svg
                                            className='h-6 w-6 text-gray-400'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                            stroke='currentColor'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth='2'
                                                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                            />
                                        </svg>
                                    </div>
                                    <div className='ml-5 w-0 flex-1'>
                                        <dl>
                                            <dt className='text-sm font-medium text-gray-500 truncate'>
                                                Games Completed
                                            </dt>
                                            <dd className='flex items-baseline'>
                                                <div className='text-2xl font-semibold text-gray-900'>
                                                    27
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
