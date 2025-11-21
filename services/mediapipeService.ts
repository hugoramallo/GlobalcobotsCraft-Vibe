import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Gesture } from "../types";

let gestureRecognizer: GestureRecognizer | null = null;

export const initializeGestureRecognizer = async (): Promise<void> => {
  if (gestureRecognizer) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
};

export const recognizeGesture = (video: HTMLVideoElement): { gesture: Gesture, landmarks: any } => {
  if (!gestureRecognizer) {
    return { gesture: Gesture.None, landmarks: null };
  }

  const results = gestureRecognizer.recognizeForVideo(video, Date.now());
  
  let detectedGesture = Gesture.None;
  const landmarks = results.landmarks && results.landmarks.length > 0 ? results.landmarks[0] : null;

  if (results.gestures.length > 0) {
    const categoryName = results.gestures[0][0].categoryName;
    
    // Map MediaPipe categories to our game Enums
    switch (categoryName) {
      case "Closed_Fist":
        detectedGesture = Gesture.Rock;
        break;
      case "Open_Palm":
        detectedGesture = Gesture.Paper;
        break;
      case "Victory":
        detectedGesture = Gesture.Scissors;
        break;
      default:
        detectedGesture = Gesture.Unknown;
    }
  }

  return { gesture: detectedGesture, landmarks };
};

export const getRecognizer = () => gestureRecognizer;