"use strict";

module AudioLibrary {

    declare var webkitAudioContext: {
        new (): AudioContext;
    }

    declare var mozAudioContext: {
        new (): AudioContext;
    }

    interface Navigator {
        getUserMedia(
            options: { video?: boolean; audio?: boolean; },
            success: (stream: any) => void,
            error?: (error: string) => void
        ): void;
        webkitGetUserMedia(
            options: { video?: boolean; audio?: boolean; },
            success: (stream: any) => void,
            error?: (error: string) => void
        ): void;
        mozGetUserMedia(
            options: { video?: boolean; audio?: boolean; },
            success: (stream: any) => void,
            error?: (error: string) => void
        ): void;
        msGetUserMedia(
            options: { video?: boolean; audio?: boolean; },
            success: (stream: any) => void,
            error?: (error: string) => void
        ): void;
    }

    export class AudioHelper {

        private static _audioHelper: AudioHelper = new AudioHelper();
        private _navigator: Navigator;

        constructor() {
            // any cast only for holding navigator internally
            this._navigator = <any>navigator;

            if (AudioHelper._audioHelper) {
                throw new Error("Use getInstance - you shmuck!");
            } else {
                AudioHelper._audioHelper = this;
                this._navigator.getUserMedia = (this._navigator.getUserMedia ||
                    this._navigator.webkitGetUserMedia ||
                    this._navigator.mozGetUserMedia ||
                    this._navigator.msGetUserMedia);

                if (!this._navigator.getUserMedia) {
                    throw new Error("Get user media is not available. AudioLibrary could not be loaded.")
                }
            }
        }

        public static getInstance(): AudioHelper {
            if (this._audioHelper) {
                return this._audioHelper;
            } else {
                return new AudioHelper();
            }
        }

        public retrieveAudioContext(): AudioContext {
            if (typeof AudioContext !== "undefined") {
                return new AudioContext();
            }
            else if (typeof webkitAudioContext !== "undefined") {
                return new webkitAudioContext();
            }
            else if (typeof mozAudioContext !== "undefined") {
                return new mozAudioContext();
            }
            else {
                throw new Error("AudioContext not supported");
            }
        }

        public get navigator(): Navigator {
            return this._navigator;
        }
    }

    export class AudioComponent {
        private _node: AudioNode;

        constructor(node: AudioNode) {
            this._node = node;
        }

        connect(destinationNode: AudioNode) {
            this._node.connect(destinationNode);
        }

        disconnect() {
            this._node.disconnect();
        }
    }

    class AudioDestinationComponent extends AudioComponent {

        connect(destinationNode: AudioNode) {
            console.log("Destination Node should not do that...");
        }
        
        disconnect() {
            console.log("Nothing to disconnet from");
        }
    }

    export class AudioNodeCreator {

        private _audioContext: AudioContext;

        constructor(audioContext: AudioContext) {
            this._audioContext = audioContext;
        }

        private requestDecodedSoundFile(fileURL: string, callback: (buffer: AudioBuffer) => void) {

            var getSound: XMLHttpRequest = new XMLHttpRequest();
            getSound.open("GET", fileURL, true);
            getSound.responseType = "arraybuffer";
            getSound.onload = () => {
                this._audioContext.decodeAudioData(getSound.response, (buffer) => {
                    callback(buffer);
                });
            };
            getSound.send();
        }

        createSoundNodeFromFileURL(audioContext: AudioContext, fileUrl: string, playbackRate: number, volumeVal: number): AudioComponent {
            var playSound = audioContext.createBufferSource();
            playSound.loop = true;
            playSound.playbackRate.value = playbackRate;

            this.requestDecodedSoundFile(fileUrl, (buffer) => {
                playSound.buffer = buffer;
            });

            playSound.start(audioContext.currentTime);

            return new AudioComponent(playSound);
        }

        private retrieveUserMicStream(callback: (stream) => void) {
            var helper: AudioHelper = AudioHelper.getInstance();
            if (helper.navigator) {
                console.log("getUserMedia supported");

                helper.navigator.getUserMedia(
                    {
                        audio: true,
                        video: false
                    },

                    (stream) => {
                        let audioContRef: any = this._audioContext;
                        callback(audioContRef.createMediaStreamSource(stream));
                    },

                    (err) => {
                        console.log("Error occured: " + err);
                    }
                );
            }
        }

        createSoundNodeFromLiveStreamn(): AudioComponent {
            var liveStreamNode: AudioComponent;

            this.retrieveUserMicStream((stream) => {
                liveStreamNode = new AudioComponent(stream);
            });

            return liveStreamNode;
        }

        // kinda breaking LSP here - if I have time to refactor I might want to change this
        createDestinationNOde(): AudioComponent {
            return new AudioDestinationComponent(this._audioContext.destination);
        }
    }
}