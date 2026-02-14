/**
 * Calculate the Best Final Price for a Product
 * Rule: Apply the HIGHER of (Product Flat Discount vs. Offer Flat Discount)
 * They are NEVER combined.
 *
 * @param {Object} product - The product object (mongoose doc or plain object)
 * @param {Array} activeOffers - List of currently active offers
 * @returns {Number} - The calculated final price
 */
exports.calculateProductFinalPrice = (product, activeOffers = []) => {
    const price = Number(product.price);

    // 1. Product Level Flat Discount
    const productFlatDiscount = product.discountPrice ? Number(product.discountPrice) : 0;

    // 2. Find Best Offer Discount
    let maxOfferDiscount = 0;

    if (activeOffers && activeOffers.length > 0) {
        // Filter offers applicable to this product
        const applicableOffers = activeOffers.filter(offer => {
            if (!offer.isActive) return false;

            // Check Dates
            const now = new Date();
            if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) return false;

            // Check Target
            if (offer.targetType === 'all') return true;
            if (offer.targetType === 'product' && offer.targetId && offer.targetId.toString() === product._id.toString()) return true;
            if (offer.targetType === 'category' && offer.targetId && offer.targetId.toString() === product.category._id?.toString()) return true; // Populated category
            if (offer.targetType === 'category' && offer.targetId && offer.targetId.toString() === product.category.toString()) return true; // Unpopulated ID

            return false;
        });

        // Get highest discount value from matching offers
        applicableOffers.forEach(offer => {
            let val = Number(offer.discountValue);
            if (val > maxOfferDiscount) {
                maxOfferDiscount = val;
            }
        });
    }

    // 3. Compare and Apply Best Discount
    const bestDiscount = Math.max(productFlatDiscount, maxOfferDiscount);

    // 4. Calculate Final Price
    let finalPrice = price - bestDiscount;

    // 5. Safety Check (No negative prices)
    if (finalPrice < 0) finalPrice = 0;

    return {
        originalPrice: price,
        finalPrice: finalPrice,
        discountAmount: bestDiscount,
        discountPercentage: price > 0 ? Math.round((bestDiscount / price) * 100) : 0,
        hasDiscount: bestDiscount > 0
    };
};
