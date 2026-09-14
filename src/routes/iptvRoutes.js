const express = require('express');
const router = express.Router();
const iptvController = require('../controllers/iptvController');

router.get('/channels', iptvController.getChannels);
router.get('/categories', iptvController.getCategories);

module.exports = router;
