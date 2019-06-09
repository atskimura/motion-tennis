// Referenced: https://p5js.org/examples/instance-mode-instance-container.html
let sketch = function(p) {
  let video;
  let poseNet;

  p.setup = function() {
    const canvasWidth = BREAKOUT_CONST.captureCanvasWidth;
    const canvasHeight = BREAKOUT_CONST.captureCanvasHeight;
    p.createCanvas(canvasWidth, canvasHeight);
    video = p.createCapture(p.VIDEO);
    video.size(canvasWidth, canvasHeight);

    // Create a new poseNet method with a single detection
    poseNet = ml5.poseNet(video, modelReady);
    // This sets up an event that fills the global variable "poses"
    // with an array every time new poses are detected
    poseNet.on("pose", function(results) {
      poses = results;
    });

    poseNet.singlePose(true);
    // Hide the video element, and just show the canvas
    video.hide();
  };

  p.draw = function() {
    p.image(video, 0, 0, p.width, p.height);

    // We can call both functions to draw all keypoints and the skeletons
    drawKeypoints(p);
    drawSkeleton(p);
  };

  function modelReady() {
    p.select("#status").remove();
  }
  // A function to draw ellipses over the detected keypoints
  function drawKeypoints() {
    // Loop through all the poses detected
    for (let i = 0; i < poses.length; i++) {
      // For each pose detected, loop through all the keypoints
      let pose = poses[i].pose;
      for (let j = 0; j < pose.keypoints.length; j++) {
        // A keypoint is an object describing a body part (like rightArm or leftShoulder)
        let keypoint = pose.keypoints[j];
        // Only draw an ellipse is the pose probability is bigger than 0.2
        if (keypoint.score > 0.2) {
          p.fill(255, 0, 0);
          p.noStroke();
          p.ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
        }
      }
    }
  }

  // A function to draw the skeletons
  function drawSkeleton() {
    // Loop through all the skeletons detected
    for (let i = 0; i < poses.length; i++) {
      let skeleton = poses[i].skeleton;
      // For every skeleton, loop through all body connections
      for (let j = 0; j < skeleton.length; j++) {
        let partA = skeleton[j][0];
        let partB = skeleton[j][1];
        p.stroke(255, 0, 0);
        p.line(
          partA.position.x,
          partA.position.y,
          partB.position.x,
          partB.position.y
        );
      }
    }
  }
};

new p5(sketch, "webcam-canvas");
