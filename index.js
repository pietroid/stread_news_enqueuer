const AWS = require('aws-sdk');
const { Pool } = require('pg');

AWS.config.update({
    region: process.env.AWS_REGION,
    credentials: new AWS.Credentials(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY)
});

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const pool = new Pool({
    host: process.env.AWS_DB_HOSTNAME,
    port: 5432,
    user: process.env.AWS_DB_USERNAME,
    database: process.env.AWS_DB_DATABASE,
    password: process.env.AWS_DB_PASSWORD,
})

exports.handler = async () => {
    try {
        const query = await pool.query('SELECT * FROM news_pages');
        pool.end();

        const newsPagesList = query?.rows ?? [];

        newsPagesList.forEach(async (newsPage) => {
            const queueParams = {
                MessageGroupId: "defaultId",
                MessageBody: JSON.stringify({
                    pageId: newsPage.id,
                    pageUrl: newsPage.main_url
                }),
                QueueUrl: process.env.AWS_NEWS_PAGES_SQS_URL,
            };
            await sqs.sendMessage(queueParams).promise();
        });
    } catch (error) {
        console.log(error);
    }
}