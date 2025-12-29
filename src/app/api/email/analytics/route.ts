import { NextRequest, NextResponse } from "next/server";
import { getClient, UmamiApiClient, WebsiteStats } from '@umami/api-client';

// Umami API configuration
// Note: For cloud.umami.is, the API endpoint should be https://cloud.umami.is/api
// For self-hosted instances, use your own API endpoint
const UMAMI_API_URL = process.env.UMAMI_API_URL || 'https://cloud.umami.is/api';
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || '96fc4b45-d8c8-4941-8a4f-330723725623'; // Using the ID from your layout.tsx
const UMAMI_API_KEY = process.env.UMAMI_API_KEY || '';

// Email configuration
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'analytics@airesumetailor.com';
const EMAIL_TO = process.env.EMAIL_TO || 'hello@airesumetailor.com';

// Get Umami client
async function getUmamiClient() {
  try {
    if (!UMAMI_API_KEY) {
      throw new Error('UMAMI_API_KEY environment variable is not set');
    }
    
    if (!UMAMI_WEBSITE_ID) {
      throw new Error('UMAMI_WEBSITE_ID environment variable is not set');
    }
    
    console.log('Initializing Umami client with:', {
      apiEndpoint: UMAMI_API_URL,
      websiteId: UMAMI_WEBSITE_ID,
      hasApiKey: !!UMAMI_API_KEY
    });
    
    const client = getClient({
      apiEndpoint: UMAMI_API_URL,
      apiKey: UMAMI_API_KEY
    });
    
    return client;
  } catch (error) {
    console.error('Umami client initialization error:', error);
    throw new Error(`Failed to initialize Umami client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch website stats using the client
async function getWebsiteStats(client: UmamiApiClient): Promise<WebsiteStats> {
  try {
    // Calculate yesterday's start and end timestamps
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Set to 12:00:00 AM
    const startAt = yesterday.getTime();
    
    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(now.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999); // Set to 11:59:59 PM
    const endAt = yesterdayEnd.getTime();
    
    console.log('Fetching stats with time range:', {
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      startTimestamp: startAt,
      endTimestamp: endAt,
    });
    
    const { ok, data, status, error } = await client.getWebsiteStats(UMAMI_WEBSITE_ID, {
      startAt,
      endAt,
    });

    if (!ok) {
      throw new Error(`Failed to fetch website stats: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (status !== 200) {
      throw new Error(`Failed to fetch website stats: Unexpected status code ${status}`);
    }

    if (!data) {
      throw new Error(`Failed to fetch website stats: No data returned`);
    }
    
    console.log('Fetched stats data:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error fetching website stats:', error);
    throw new Error(`Failed to fetch website stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Format analytics data into HTML email
function formatEmailContent(stats: WebsiteStats) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log("Formatting email with stats:", JSON.stringify(stats, null, 2));
  
  // Safely extract values with fallbacks
  const pageviews = stats?.pageviews?.value ?? 0;
  const visitors = stats?.visitors?.value ?? 0;
  const visits = stats?.visits?.value ?? 0;
  const bounces = stats?.bounces?.value ?? 0;
  const totaltime = stats?.totaltime?.value ?? 0;
  
  // Calculate bounce rate safely (avoid division by zero)
  const bounceRate = visits > 0 ? ((bounces / visits) * 100).toFixed(2) : '0.00';
  
  // Calculate average visit duration in minutes (totaltime is in seconds)
  const avgDurationMinutes = visits > 0 ? (totaltime / visits / 60).toFixed(2) : '0.00';
  
  // Calculate average visit duration in seconds for display
  const avgDurationSeconds = visits > 0 ? (totaltime / visits).toFixed(0) : '0';
  
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c7a7b; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          h2 { color: #2c7a7b; margin-top: 30px; }
          .stat-box { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #2c7a7b; }
          .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
          th { background-color: #f5f5f5; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>AI Resume Tailor Analytics Report</h1>
          <p>Here's your analytics report for <strong>${date}</strong></p>
          
          <div class="stat-box">
            <div class="stat-value">${pageviews.toLocaleString()}</div>
            <div class="stat-label">Page Views</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-value">${visitors.toLocaleString()}</div>
            <div class="stat-label">Unique Visitors</div>
          </div>

          <div class="stat-box">
            <div class="stat-value">${visits.toLocaleString()}</div>
            <div class="stat-label">Total Visits</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-value">${bounceRate}%</div>
            <div class="stat-label">Bounce Rate</div>
          </div>
                    
          <div class="stat-box">
            <div class="stat-value">${avgDurationMinutes} minutes</div>
            <div class="stat-label">Average Visit Duration (${avgDurationSeconds} seconds)</div>
          </div>
          
          <div class="footer">
            <p>This report was automatically generated from your Umami analytics data.</p>
            <p>Report generated at: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Send email using Mailgun's REST API directly
async function sendEmail(subject: string, htmlContent: string) {
  console.log('Attempting to send email with Mailgun REST API');

  if (!MAILGUN_DOMAIN || !MAILGUN_API_KEY) {
    throw new Error('Mailgun configuration is missing');
  }

  try {
    const formData = new FormData();
    formData.append('from', EMAIL_FROM);
    formData.append('to', EMAIL_TO);
    formData.append('subject', subject);
    formData.append('html', htmlContent);

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify CRON_SECRET for automated runs (skip in development)
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = req.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;
      
      if (!cronSecret) {
        console.warn('CRON_SECRET not set, but required in production');
      }
      
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
          { status: 401 }
        );
      }
    }

    console.log('Starting analytics email generation...');
    
    // Initialize Umami client
    const client = await getUmamiClient();
    console.log('Umami client initialized successfully');
    
    // Fetch analytics data
    const stats = await getWebsiteStats(client);
    console.log('Analytics stats fetched successfully');
    
    // Format email content
    const htmlContent = formatEmailContent(stats);
    console.log('Email content formatted');
    
    // Send email
    const emailResult = await sendEmail(
      `AI Resume Tailor Analytics Report - ${new Date().toLocaleDateString()}`,
      htmlContent
    );
    console.log('Email sent successfully:', emailResult);
    
    return NextResponse.json({
      success: true,
      message: 'Analytics email sent successfully',
      emailId: emailResult.id,
      stats: {
        pageviews: stats?.pageviews?.value ?? 0,
        visitors: stats?.visitors?.value ?? 0,
        visits: stats?.visits?.value ?? 0,
      }
    });
  } catch (error) {
    console.error('Error in analytics email endpoint:', error);
    
    // Send error notification email
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorHtml = `
        <html>
          <body>
            <h1>Analytics Email Error</h1>
            <p>There was an error generating the analytics report:</p>
            <pre style="background-color: #f8f8f8; padding: 15px; border-radius: 5px;">${errorMessage}</pre>
            <p>Please check the server logs for more details.</p>
          </body>
        </html>
      `;
      
      await sendEmail(
        `ERROR: AI Resume Tailor Analytics Report - ${new Date().toLocaleDateString()}`,
        errorHtml
      );
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to generate analytics report, but error notification was sent',
          error: errorMessage
        },
        { status: 500 }
      );
    } catch (emailError) {
      // If even the error email fails
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to generate analytics report and error notification',
          error: error instanceof Error ? error.message : String(error),
          emailError: emailError instanceof Error ? emailError.message : String(emailError)
        },
        { status: 500 }
      );
    }
  }
} 