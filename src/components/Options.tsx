import React from 'react'
import ReactDOM from 'react-dom'
import { defaultStorage } from '../constants'
import styled, { createGlobalStyle } from 'styled-components'
import MUI from './MUI'
import {
  FormGroup,
  Checkbox,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@material-ui/core'
import { get } from 'lodash-es'

interface OptionItem {
  name: string
  value: string
  label: string
}

interface Option {
  type: string
  title: string
  class: string
  items: OptionItem[]
}

interface State {
  storage?: {
    [x: string]: any
    redirect: boolean
    redirectList: string[]
  }
}

const options = [
  {
    type: 'redirect',
    title: 'リダイレクトパス',
    class: 'redirect-section',
    items: [
      {
        name: 'redirectList',
        value: 'watch',
        label: '/watch/*',
      },
      {
        name: 'redirectList',
        value: 'mylist',
        label: '/mylist/*',
      },
    ],
  },
]

const Options: React.FC = () => {
  const [state, setState] = React.useState<State>({
    storage: undefined,
  })

  React.useEffect(() => {
    const handleChangeStorage = (changes: {
      [key: string]: chrome.storage.StorageChange
    }) => {
      let newStorage: Partial<State['storage']> = {}

      for (let name in changes) {
        newStorage[name] = changes[name].newValue
      }

      const storage = Object.assign({}, state.storage, newStorage)

      setState({
        storage,
      })
    }

    chrome.storage.local.get(defaultStorage.extension.local, (storage: any) => {
      setState({ storage })
    })

    chrome.storage.onChanged.addListener(handleChangeStorage)

    return () => {
      chrome.storage.onChanged.removeListener(handleChangeStorage)
    }
  }, [JSON.stringify(state)])

  const isChecked = React.useCallback(
    (type: string, item: OptionItem) => {
      switch (type) {
        case 'options': {
          return state.storage && state.storage[item.name]
        }

        case 'redirect': {
          return (
            state.storage && state.storage.redirectList.includes(item.value)
          )
        }

        default:
          return false
      }
    },
    [state]
  )

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const result: Partial<State['storage']> = {}

    switch (target.name) {
      case 'redirectList': {
        let redirectList = state.storage
          ? Array.from(new Set(state.storage.redirectList))
          : []
        let index = redirectList.indexOf(target.value)

        if (target.checked && index <= 0) {
          redirectList.push(target.value)
        } else if (index >= 0) {
          redirectList.splice(index, 1)
        }

        result.redirectList = redirectList
        break
      }

      case 'redirect':
        if (state.storage) {
          result.redirect = !state.storage.redirect
        }
        break
    }

    chrome.storage.local.set(result)
  }

  return (
    <>
      {state.storage &&
        options.map((option) => (
          <FormControl key={`options-${option.type}`}>
            <FormLabel>{option.title}</FormLabel>
            <FormGroup>
              {option.items.map((item) => {
                return (
                  <FormControlLabel
                    key={`options-item-${item.name}-${item.value}`}
                    control={
                      <Checkbox
                        name={item.name}
                        value={item.value}
                        onChange={handleChange}
                        checked={isChecked(option.type, item)}
                        inputProps={{
                          style: {
                            display: 'none',
                          },
                        }}
                      />
                    }
                    label={item.label}
                  />
                )
              })}
            </FormGroup>
          </FormControl>
        ))}
    </>
  )
}

const GlobalStyle = createGlobalStyle`
#app {
  padding: 16px
}
`

ReactDOM.render(
  <MUI>
    <GlobalStyle />
    <Options />
  </MUI>,
  document.getElementById('app')
)
