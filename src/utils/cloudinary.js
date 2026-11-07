const crypto = require("crypto");

const cfg = () => ({ cloud: process.env.CLOUDINARY_CLOUD_NAME, key: process.env.CLOUDINARY_API_KEY, secret: process.env.CLOUDINARY_API_SECRET });
exports.configured = () => { const c = cfg(); return !!(c.cloud && c.key && c.secret); };

// Cloudinary signature: sort the params, join as key=value&key=value, add the API secret, SHA-1.
exports.signParams = (params, secret) =>
  crypto.createHash("sha1").update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + secret).digest("hex");

// The browser uploads straight to Cloudinary using this signature. The file never passes through our server,
// and the public_id is fixed by us, so a student can only ever replace their own picture.
exports.signUpload = (publicId) => {
  const c = cfg();
  const params = { invalidate: "true", overwrite: "true", public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  return { cloudName: c.cloud, apiKey: c.key, ...params, signature: exports.signParams(params, c.secret) };
};

// Only accept pictures that really live in OUR Cloudinary account under the expected public id
exports.ownsUrl = (url, publicId) => {
  const c = cfg();
  return typeof url === "string" && url.length < 500 && url.startsWith(`https://res.cloudinary.com/${c.cloud}/image/upload/`) && url.includes(`/${publicId}`);
};
