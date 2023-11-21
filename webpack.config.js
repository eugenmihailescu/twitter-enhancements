const path = require("path");

const CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin;
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    background: "./background.js",
    content: "./content.js",
    options: "./options.js"
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist")
  },
  module: {
    rules: [
      // Rule for JavaScript files
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      // Rule for CSS files
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"]
      }
    ]
  },
  optimization: {
    minimizer: [
      `...`, //extend existing minimizers
      new CssMinimizerPlugin()
    ]
  },
  plugins: [
    // clean the build folder
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "icons", to: "icons", globOptions: { ignore: ["**/*.svg"] } },
        { from: "manifest.json", to: "" },
        { from: "README.md", to: "" },
        //{ from: "*.html", to: "" },
        //{ from: "*.css", to: "" },
        { from: "LICENSE", to: "" }
      ]
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "options.html"),
      filename: "options.html",
      chunks: ["options"]
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css" // Output file name for the extracted CSS
    })
  ]
};
