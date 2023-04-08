import Head from 'next/head'
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import useInterval from 'use-interval';
import styles from '@/styles/Home.module.css'

class Queue<T> {
  _store: T[] = [];
  push(val: T) {
    this._store.push(val);
  }
  pop(): T | undefined {
    return this._store.shift();
  }
  len(): number {
    return this._store.length;
  }
}

const PROMPT = '\
You are an AI helping the player play a text adventure game. You will stay in character as the GM.\
\
The player plays a baguette. The goal of the game is to escape from a French restaurant without the customers eating the player.\
\
As GM, if the player dies print "GAME OVER" and end the game. If the player wins, print "YOU ESCAPED!" and end the game.\
\
At each step:\
    * Offer a short description of my surroundings (1 paragraph)\
    * List the items I am carrying, if any\
    * Offer me 4 terse numbered action choices (1 or 2 words each)\
\
In any case, be relatively terse and keep word counts small.\
'

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  let [outputQueue, setOutputQueue] = useState<Queue<string>>(new Queue<string>());
  const [input, setInput] = useState<string>('');
  const [session, setSession] = useState<{ role: string; content: string }[]>([]);

  const recordInput = (event: ChangeEvent<HTMLInputElement>): void => {
    setInput(event.target.value);
    inputRef.current?.focus();
  }

  const processInput = async (event: KeyboardEvent): Promise<void> => {
    if (event.key === "Enter") {
      console.log(input);


      session.push({ "role": "user", "content": "PLAYER: " + input });
      const response = await fetch('/api/ask_skynet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: session })
      });

      const data = await response.json();
      console.log('Response: ', data);

      if (inputRef?.current) {
        inputRef.current.value = '';
      }
      if (outputRef.current) {
        outputRef.current.innerHTML = '';
      }

      // if (outputRef.current) {
      // outputRef.current.innerHTML = data.response;
      for (const c of (data.response as string)) {
        outputQueue.push(c);
      }
      session.push({ "role": "system", "content": data.response });
      // }
    }
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (session.length === 0) {
      session.push({ "role": "user", "content": "PLAYER: " + PROMPT });
      fetch('/api/ask_skynet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: session })
      })
        .then((response) => {
          response.json().then((data) => {
            let print = data.response;
            // if (outputRef.current) {
            // outputRef.current.innerHTML = print;
            for (const c of (print as string)) {
              outputQueue.push(c);
            }
            session.push({ "role": "system", "content": print });
            // }
          });
        });
    }
    inputRef.current?.focus();
  }, [])

  useInterval(() => {
    if (outputQueue.len() > 0) {
      let char = outputQueue.pop();
      if (char) {
        if (outputRef.current) {
          outputRef.current.innerHTML = outputRef.current.innerHTML + char;
        }
      }
    }
  }, 50);

  return (
    <>
      <Head>
        <title>A Bread Heads Text Adventure</title>
        <meta name="description" content="A Bread Heads Text Adventure" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        {/* Game Content */}
        <div className={styles.output} ref={outputRef}></div>
        {/* Player Input */}
        <div className={styles.input}>
          <span className="ml-2"></span>
          <input
            ref={inputRef}
            className={styles.inputBox}
            autoFocus={true}
            spellCheck="false"
            onChange={recordInput}
            onKeyDown={processInput}
          />
        </div>
      </main>
    </>
  )
}
