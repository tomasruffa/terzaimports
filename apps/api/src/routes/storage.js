const express = require('express')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const { getS3Client } = require('../lib/storage')

const router = express.Router()

router.get(/.*/, async (req, res) => {
  const key = decodeURIComponent(req.path.replace(/^\//, ''))
  if (!key || key.includes('..')) {
    return res.status(400).send('Invalid key')
  }

  try {
    const object = await getS3Client().send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      })
    )

    if (!object.Body) {
      return res.status(404).send('Not found')
    }

    res.set('Content-Type', object.ContentType || 'application/octet-stream')
    res.set('Cache-Control', 'public, max-age=86400, immutable')
    object.Body.pipe(res)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).send('Not found')
    }
    console.error('[storage/get]', key, err.message)
    res.status(500).send('Error fetching file')
  }
})

module.exports = router
