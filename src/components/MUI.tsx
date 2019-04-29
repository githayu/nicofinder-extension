import React from 'react'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core'
import { blue } from '@material-ui/core/colors'

const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: blue,
  },
  typography: {
    useNextVariants: true,
    htmlFontSize: 10,
  },
})

const MUI: React.FC = (props) => {
  return <MuiThemeProvider theme={theme}>{props.children}</MuiThemeProvider>
}

export default MUI
