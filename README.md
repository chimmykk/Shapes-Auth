# SHAPE AUTH EXAMPLE

- A simple, centered form layout to focus user attention on the authentication process.
- Subtle animations for button hovers and form submission feedback to enhance user experience.
- Use lock and key icon to represent authentication and key icon to represent one-time key.

## Core Features:

- Login Button: Display a login button that redirects to the Shapes Inc authorization page (`/authorize?app_id=[your_app_id]`).
- One-Time Code Input: Input field for the user to paste the one-time code after authentication on Shapes Inc.
- Token Exchange Handler: Client-side logic to handle the submission of the one-time code and exchange it for a user auth token.
- Auth Token Display: Display the received user auth token. Provide UI and client-side logic to store in browser local storage or cookies. Disclaimer displayed explaining not to show or store auth tokens in a production environment.


