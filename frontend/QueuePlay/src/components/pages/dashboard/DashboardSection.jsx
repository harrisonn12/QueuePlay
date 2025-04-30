import { useState } from 'react';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ClockIcon,
    PlayCircleIcon,
} from '@heroicons/react/24/solid';

export const DashboardSection = () => {
    const [isLaunching, setIsLaunching] = useState(false);

    const text = {
        gameDashboardSection: 'Game Dashboard',
        gameDashboardDescription:
            'Your gaming hub and quick access to QueuePlay games.',
        launchGameButton: 'Launch Game',
        launchGameButtonDescription:
            'Click to launch your favorite QueuePlay game',
        timePlayed: 'Time Played',
        gamesCompleted: 'Games Completed',
    };

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
                    {text.gameDashboardSection}
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    {text.gameDashboardDescription}
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
                                        <ArrowPathIcon className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' />
                                        Launching...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircleIcon className='w-6 h-6 mr-2' />
                                        {text.launchGameButton}
                                    </>
                                )}
                            </button>
                        </div>
                        <p className='mt-4 text-sm text-gray-500'>
                            {text.launchGameButtonDescription}
                        </p>
                    </div>

                    {/* User Stats */}
                    <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2'>
                        <div className='bg-white overflow-hidden shadow rounded-lg'>
                            <div className='p-5'>
                                <div className='flex items-center'>
                                    <div className='flex-shrink-0'>
                                        <ClockIcon className='h-6 w-6 text-gray-400' />
                                    </div>
                                    <div className='ml-5 w-0 flex-1'>
                                        <dl>
                                            <dt className='text-sm font-medium text-gray-500 truncate'>
                                                {text.timePlayed}
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
                                        <CheckCircleIcon className='h-6 w-6 text-gray-400' />
                                    </div>
                                    <div className='ml-5 w-0 flex-1'>
                                        <dl>
                                            <dt className='text-sm font-medium text-gray-500 truncate'>
                                                {text.gamesCompleted}
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
