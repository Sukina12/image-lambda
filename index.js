'use strict';

const async = require ('async');
const AWS = require ('aws-sdk');
const gm = require ('gm').subClass({imageMagick:true});

const util = require ('util');

const maxWidth = 100;
const maxHeight = 100;

const s3 = new AWS.S3();

exports.handler = function (event,context,cb){
  let srcBucket = event.Records[0].s3.bucket.name;
  let srcKey = decodeURIComponent (event.Records[0].s3.object.key.replace(/\+/g, ' '));

  let dstBucket = srcBucket+'resized';
  let dstKey = 'resized-' + srcKey;

  if (srcBucket === dstBucket){
    cb('Source and destination buckets are the same.');
    return;
  }

  let typeMatch = srcKey.match (/\.([^.]*)$/);
  if(!typeMatch){
    cb('Could not determine the image type.');
    return;
  }

  let imageType = typeMatch[1].toLocaleLowerCase();
  if(imageType !== 'jpg' && imageType !== 'png'){
    cb (`Unsupported image type: ${imageType}`);
    return;
  }

  async.waterfall ([
    function download(next){
      s3.getObject ({
        Bucket:srcBucket,
        key:srcKey,
      },
      next);
    },
    function transform (response,next){
      gm(response.body).size(function (err,size){
        let scalingFactor = Math.min(
          maxWidth / object.size.width,
          maxHeight / size.height,
        );
        let width = scalingFactor * size.width;
        let height = scalingFactor * size.height;

        this.resize (width,height)
           .toBuffer(imageType,function(err,buffer){
             if(err){
               next(err);
             }else {
               next(null, response.ContentType, buffer);
             }
           });
      });
    },
    function upload (contentType, data, next){
      s3.putObject ({
        Bucket:dstBucket,
        Key:dstKey,
        Body:data,
        ContentType : contentType,
      },
      next);
    },

  ], function(err){
    if(err){
      console.error (
        'Unable to resize ' + srcBucket + '/' + srcKey +
                    ' and upload to ' + dstBucket + '/' + dstKey +
                    ' due to an error: ' + err,
      );
    } else {
      console,log(
        'Successfully resized ' + srcBucket + '/' + srcKey +
        ' and uploaded to ' + dstBucket + '/' + dstKey,
      );
    }
    cb (null,'message');
  },
  );
};

