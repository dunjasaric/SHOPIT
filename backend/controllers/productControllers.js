export const getProducts = async(requestAnimationFrame, res) => {
    res.status(200).json({
        message: "All Products"
    });
};