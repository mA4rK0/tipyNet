import { Idl } from "@project-serum/anchor";

export const IDL: Idl = {
  version: "0.1.0",
  name: "tipy_net",
  instructions: [
    {
      name: "sendTip",
      accounts: [
        {
          name: "dataTransaction",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sender",
          isMut: true,
          isSigner: true,
        },
        {
          name: "receiver",
          isMut: true,
          isSigner: false,
        },
        {
          name: "senderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiverTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
        {
          name: "message",
          type: "string",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "DataTransaction",
      type: {
        kind: "struct",
        fields: [
          {
            name: "sender",
            type: "publicKey",
          },
          {
            name: "receiver",
            type: "publicKey",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "message",
            type: "string",
          },
          {
            name: "timestamp",
            type: "i64",
          },
          {
            name: "isSol",
            type: "bool",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "MessageTooLong",
      msg: "Message exceeds 100 character limit",
    },
    {
      code: 6001,
      name: "InsufficientFunds",
      msg: "Insufficient funds for transfer",
    },
    {
      code: 6002,
      name: "InvalidTokenAccount",
      msg: "Invalid token account",
    },
    {
      code: 6003,
      name: "ReceiverTokenAccountNotInitialized",
      msg: "Receiver token account not initialized",
    },
    {
      code: 6004,
      name: "ClockError",
      msg: "Clock error",
    },
  ],
  metadata: {
    address: "JBkL19LKsvxbtu5fFvF6TprnQAfk7uX7TFzgYGUUAV7S",
  },
};
