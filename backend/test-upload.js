import cloudinary from "./config/cloudinary.js";

async function test() {
    try {
        const result = await cloudinary.uploader.upload(
            "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            {
                folder: "portfolio"
            }
        );

        console.log(result);
    } catch (err) {
        console.log(err);
    }
}

test();