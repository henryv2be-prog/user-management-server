@echo off
echo Installing SimplifiAccess Mobile App...
echo.

echo Installing dependencies...
call npm install

echo.
echo Setup complete!
echo.
echo To start the app:
echo   npm start
echo.
echo To run on Android:
echo   npm run android
echo.
echo To run on iOS:
echo   npm run ios
echo.
echo Make sure to update the server URL in src/services/api.js
echo.
pause
