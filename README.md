# Strava

## Start flows on Strava events
This App makes it possible to receive Webhook events originating from Strava as described on https://developers.strava.com/docs/webhooks/.
The Webhook will be called by Strava upon Strava activity creation, change or deletion. 

## Setup
Setup consist out of three steps;
1. Create Strava API Application 
2. Add Strava user as Homey device and configure your Strava API Application settings on Homey

After completing these steps you can use the flow trigger cards to create flows on your Homey.

### Create Strava API Application
You will have to execute the following steps to make it possible for Strava to call the Webhook on your Homey.
1. If you have not already, go to https://www.strava.com/register and sign up for a Strava account.
2. After you are logged in, go to https://www.strava.com/settings/api and create an app. Fill in the following settings:
   * Application name: Homey - A Better Smart Home
   * Category: DataImporter
   * Club: Choose None
   * Website: https://homey.app/nl-nl/app/com.thayoung1.strava
   * Description: Execute flows on your Homey whenever an activity is created, changed or deleted.
   * Authorization of callback domain: callback.athom.com
   Tick the checkbox with the Strava API agreement and click the 'Create' button. Next step is to upload an image. You can use the following image.

   ![Strava API Application image](https://user-images.githubusercontent.com/33259655/217798881-451cb793-f45b-4762-aed2-b118ee4cd5c0.jpg)
3. You should see the “My API Application” page now. Note the Client ID and Client Secret fields. You can reveal their values by clicking on the 'Show' button. We need these values to configure the Homey App during the addition of a new device which represents a Strava User.

### Add Strava user as Homey device and configure your Strava API Application settings on Homey
After creating the Strava API Application we can configure the Webhook on Homey so that Homey can add a subscription to receive Strava events. This will be automatically done when adding the first 'Strava User' device in Homey. Fill in the **Client ID** and **Client Secret** and click the 'Create webhook' button.

![Strava Homey App Pair Device page](https://user-images.githubusercontent.com/33259655/218209816-67d0ff11-8c45-45b8-bb18-004d285640d4.png)

After creation of the webhook you will be asked to authorize your Strava User for the earlier created Strava API Application. Login with your Strava account and accept the proposed scopes. Your Strava User will then be added to Homey as a new device and you can use it in flows. 

It is possible to add multiple Strava Users as devices.