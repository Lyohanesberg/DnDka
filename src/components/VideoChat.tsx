
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { peerService } from '../services/peerService';
import { Mic, MicOff, Video, VideoOff, X, MinusSquare, Maximize2 } from 'lucide-react';

const VideoElement: React.FC<{ stream: MediaStream; muted?: boolean; label?: string; isLocal?: boolean }> = ({ stream, muted, label, isLocal }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-full h-full bg-black rounded overflow-hidden shadow-inner border border-stone-800">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className={`w-full h-full object-cover ${isLocal ? "transform scale-x-[-1]" : ""}`} // Only mirror local
            />
            {label && (
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-bold truncate max-w-[90%]">
                    {label}
                </div>
            )}
        </div>
    );
};

const VideoChat: React.FC = () => {
    const { isVideoChatOpen, toggleVideoChat, remoteCharacters, character } = useGameStore();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (isVideoChatOpen) {
            startCall();
        } else {
            endCall();
        }
    }, [isVideoChatOpen]);

    useEffect(() => {
        peerService.onStreamFound = (peerId, stream) => {
            setRemoteStreams(prev => new Map(prev).set(peerId, stream));
        };
        peerService.onStreamLost = (peerId) => {
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.delete(peerId);
                return newMap;
            });
        };
    }, []);

    const startCall = async () => {
        try {
            const stream = await peerService.startMedia(true, true);
            setLocalStream(stream);
            setIsMicOn(true);
            setIsCamOn(true);
        } catch (e) {
            console.error("Could not start video chat", e);
        }
    };

    const endCall = () => {
        peerService.stopMedia();
        setLocalStream(null);
        setRemoteStreams(new Map());
    };

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    const toggleCam = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !isCamOn);
            setIsCamOn(!isCamOn);
        }
    };

    if (!isVideoChatOpen) return null;

    if (isMinimized) {
        return (
            <div className="fixed bottom-20 right-4 z-[90]">
                <button 
                    onClick={() => setIsMinimized(false)}
                    className="bg-stone-900 border border-amber-500 text-amber-500 p-3 rounded-full shadow-xl hover:bg-stone-800 transition-transform hover:scale-110 flex items-center justify-center"
                    title="Розгорнути Відеочат"
                >
                    <Video className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {remoteStreams.size + (localStream ? 1 : 0)}
                    </span>
                </button>
            </div>
        );
    }

    const totalStreams = (localStream ? 1 : 0) + remoteStreams.size;
    const gridCols = totalStreams <= 1 ? 1 : totalStreams <= 4 ? 2 : 3;

    return (
        <div className="fixed bottom-16 right-4 z-[90] w-80 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="bg-stone-950 p-2 flex justify-between items-center border-b border-stone-800 cursor-move">
                <h3 className="text-xs font-bold text-stone-400 uppercase flex items-center gap-2">
                    <Video className="w-3 h-3" /> Відеочат ({totalStreams})
                </h3>
                <div className="flex gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1 text-stone-500 hover:text-white"><MinusSquare className="w-3 h-3"/></button>
                    <button onClick={toggleVideoChat} className="p-1 text-stone-500 hover:text-red-500"><X className="w-3 h-3"/></button>
                </div>
            </div>

            {/* Video Grid */}
            <div 
                className="p-2 bg-stone-900 grid gap-2 overflow-y-auto max-h-[400px]"
                style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
                {localStream && (
                    <div className="aspect-video">
                        <VideoElement stream={localStream} muted={true} label={`${character.name} (Ви)`} isLocal={true} />
                    </div>
                )}
                {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
                    const name = remoteCharacters[peerId]?.name || peerId.substring(0, 5);
                    return (
                        <div key={peerId} className="aspect-video">
                            <VideoElement stream={stream} label={name} isLocal={false} />
                        </div>
                    );
                })}
                {totalStreams === 0 && (
                    <div className="col-span-full h-24 flex items-center justify-center text-stone-600 text-xs italic">
                        З'єднання...
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-2 bg-stone-950 flex justify-center gap-4 border-t border-stone-800">
                <button 
                    onClick={toggleMic}
                    className={`p-2 rounded-full ${isMicOn ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-red-900/50 text-red-400 hover:bg-red-900'}`}
                    title="Мікрофон"
                >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button 
                    onClick={toggleCam}
                    className={`p-2 rounded-full ${isCamOn ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-red-900/50 text-red-400 hover:bg-red-900'}`}
                    title="Камера"
                >
                    {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button 
                    onClick={toggleVideoChat}
                    className="p-2 rounded-full bg-red-800 text-white hover:bg-red-700"
                    title="Завершити"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default VideoChat;
