const express = require('express');
const passport = require('passport');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const { google } = require('googleapis');
const cookieParser = require('cookie-parser');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const path = require('path');

const app = express();
app.set('views', './views');

// Set the view engine to use HTML
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static('public'));


// Serve static files from the 'public' directory

var userProfile;
var accessToken;
// Middleware for session management
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true,cookie: {
    maxAge: 60*100*100, // Set the cookie to expire immediately
    httpOnly: true, // Ensures the cookie is only accessed through HTTP requests
  } }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
    cb(null, user);
  });
  
  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });

  app.use(cookieParser());

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: "565331886241-8ipi26c0k6sh42iefhj6gfrqhu76vp1c.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "https://accessmanagementlabfoundationsociallogin.onrender.com/auth/google/callback"
}, (token, tokenSecret, profile, done) => {
    // Your authentication logic here
    userProfile=profile;
    //console.log(token);
    accessToken = token; 
    return done(null, userProfile,accessToken);
    
}));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email', 'https://www.googleapis.com/auth/contacts.readonly','https://www.googleapis.com/auth/drive.readonly'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect success.
    
    res.redirect('/profile');
  });

  app.get('/profile', ensureAuthenticated, async (req, res) => {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: accessToken, // Assuming you have stored the user's access token during authentication
    });

    const people = google.people({
        version: 'v1',
        auth: oauth2Client,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });


    try {
        const response = await people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,phoneNumbers',
        });

        const response1 = await drive.files.list({
            pageSize: 10, // Set the number of files to retrieve
          });
        const name = response.data.names[0].displayName;
         const files = response1.data.files;
        res.render('layout/files',{files:files,name:name});
        //res.send(name);
    
    } catch (error) {
        console.error('Error fetching contact information:', error);
        res.send('Error fetching contact information.');
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.render('layout/index');
});

app.get('/logout', (req, res) => {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: accessToken, // Use the access token you obtained during authentication
         // If you have a refresh token
    });

    // Revoke the access token
    oauth2Client.revokeToken(accessToken, (err) => {
        if (err) {
            console.error('Error revoking access token:', err);
        }

        // Clear local session and cookies
        req.logout((err)=>{
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
                res.clearCookie('connect.sid');
                res.redirect('/login');
            });
        });
        
    });
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
