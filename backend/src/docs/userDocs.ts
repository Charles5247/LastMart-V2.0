// GET /api/users/me
/** 
 * 
 * @swagger
 * /api/users/me: 
 *   get:
 *     summary: Gets the details of the current logged-in user
 *     tags: [Users]
 *     responses: 
 *       200: 
 *         description: Profile fetched
 *         content: 
 *           application/json: 
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties: 
 *                     user: 
 *                       type: object
 *                     vendor: 
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
*/

// PUT /api/users/me
/**
 * 
 * @swagger	
 * /api/users/me: 
 *   put:
 *     summary: Update the details of the current logged-in user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               city:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses: 
 *       200: 
 *         description: Profile updated
 *         content: 
 *           application/json: 
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */


// GET /api/users/saved-vendors
/**
 * 
 * @swagger	
 * /api/users/saved-vendors: 
 *   get:
 *     summary: Get the details of all the saved vendors 
 *     tags: [Users]
 *     responses: 
 *       200: 
 *         description: Profile updated
 *         content: 
 *           application/json: 
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     savedVendors:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// POST /api/users/saved-vendors
/**
 * 
 * @swagger	
 * /api/users/saved-vendors: 
 *   post:
 *     summary: Get the details of all the saved vendors 
 *     tags: [Users]
 *     responses: 
 *       200: 
 *         description: Profile updated
 *         content: 
 *           application/json: 
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     savedVendors:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */