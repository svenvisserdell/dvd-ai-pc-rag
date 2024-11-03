const colors = require('tailwindcss/colors')
const animate = require('tailwindcss-animate')
const assistant_tailwind = require('@assistant-ui/react/tailwindcss')
const assistant_markdown = require('@assistant-ui/react-markdown/tailwindcss')
const typography = require('@tailwindcss/typography')

module.exports = {
  darkMode: "class",
  content: [
    './renderer/pages/**/*.{js,ts,jsx,tsx}',
    './renderer/components/**/*.{js,ts,jsx,tsx}',
    './renderer/api/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    // colors: {
    //   // use colors only specified
    //   white: colors.white,
    //   gray: colors.gray,
    //   blue: colors.blue,
    //   black: colors.black,
    // },
    extend: {},
  },
  plugins: [
    animate,
    assistant_tailwind,
    assistant_markdown,
    typography
  ],
}
