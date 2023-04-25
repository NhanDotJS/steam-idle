const fs = require("fs");
const jwt_decode = require("jwt-decode");
const QRCode = require("qrcode");

const SteamUser = require("steam-user");
const { EAuthTokenPlatformType, LoginSession } = require("steam-session");

const path = "./refreshToken.txt";

const client = new SteamUser();

// if (fs.existsSync(path)) {
//   fs.readFile(path, "utf8", (err, data) => {
//     if (err) {
//       console.error(err);
//       return;
//     }
//     try {
//       var decoded = jwt_decode(data);
//       const exp = decoded.exp;
//     } catch (error) {
//       console.log("Invalid token");
//       main();
//     }

//     if (Date.now() >= exp * 1000) {
//       console.log("Token expired! Please log in again.");
//       main();
//     } else {
//       console.log("Token not expired");
//       console.log("Attempting to log in...");
//       logIn(data);
//     }
//   });
// } else {
//   main();
// }

main();

// We need to wrap everything in an async function since node <14.8 cannot use await in the top-level context
async function main() {
  // Create our LoginSession and start a QR login session.
  let session = new LoginSession(EAuthTokenPlatformType.SteamClient);
  session.loginTimeout = 120000; // timeout after 2 minutes
  let startResult = await session.startWithQR();
  QRCode.toString(
    startResult.qrChallengeUrl,
    { type: "terminal" },
    function (err, url) {
      console.log(url);
    }
  );

  let qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
    encodeURIComponent(startResult.qrChallengeUrl);
  console.log(`Open QR code: ${qrUrl}`);

  session.on("remoteInteraction", () => {
    console.log(
      "Looks like you've scanned the code! Now just approve the login."
    );
  });

  // No need to handle steamGuardMachineToken since it's only applicable to accounts using email Steam Guard,
  // and such accounts can't be authed using a QR code.

  session.on("authenticated", async () => {
    console.log("\nAuthenticated successfully! Printing your tokens now...");
    console.log(`SteamID: ${session.steamID}`);
    // console.log(`Account name: ${session.accountName}`);
    // console.log(`Access token: ${session.accessToken}`);
    // console.log(`Refresh token: ${session.refreshToken}`);

    // We can also get web cookies now that we've negotiated a session
    // let webCookies = await session.getWebCookies();
    // console.log("Web session cookies:");
    // console.log(webCookies);
    fs.writeFile(path, session.refreshToken, (err) => {
      if (err) {
        console.error(err);
      }
    });

    logIn(session.refreshToken);
  });

  session.on("timeout", () => {
    console.log("This login attempt has timed out.");
  });

  session.on("error", (err) => {
    // This should ordinarily not happen. This only happens in case there's some kind of unexpected error while
    // polling, e.g. the network connection goes down or Steam chokes on something.
    console.log(`ERROR: This login attempt has failed! ${err.message}`);
  });
}

function logIn(refreshToken) {
  const logOnOptions = {
    refreshToken: refreshToken,
  };
  client.logOn(logOnOptions);

  client.on("loggedOn", () => {
    console.log("Logged into Steam");
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(["Ong Liem", 1070330, 1293830]);
  });
}
