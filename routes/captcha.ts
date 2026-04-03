/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import { CaptchaModel } from '../models/captcha'

function calculateCaptchaAnswer (
    firstTerm: number,
    firstOperator: string,
    secondTerm: number,
    secondOperator: string,
    thirdTerm: number
): number {
  if (firstOperator === '*') {
    const firstResult = firstTerm * secondTerm
    return secondOperator === '+'
        ? firstResult + thirdTerm
        : secondOperator === '-'
            ? firstResult - thirdTerm
            : firstResult * thirdTerm
  }

  if (secondOperator === '*') {
    const secondResult = secondTerm * thirdTerm
    return firstOperator === '+'
        ? firstTerm + secondResult
        : firstOperator === '-'
            ? firstTerm - secondResult
            : firstTerm * secondResult
  }

  const intermediateResult =
      firstOperator === '+'
          ? firstTerm + secondTerm
          : firstOperator === '-'
              ? firstTerm - secondTerm
              : firstTerm * secondTerm

  return secondOperator === '+'
      ? intermediateResult + thirdTerm
      : secondOperator === '-'
          ? intermediateResult - thirdTerm
          : intermediateResult * thirdTerm
}

export function captchas () {
  return async (req: Request, res: Response) => {
    const captchaId = req.app.locals.captchaId++
    const operators = ['*', '+', '-']

    const firstTerm = Math.floor((Math.random() * 10) + 1)
    const secondTerm = Math.floor((Math.random() * 10) + 1)
    const thirdTerm = Math.floor((Math.random() * 10) + 1)

    const firstOperator = operators[Math.floor((Math.random() * 3))]
    const secondOperator = operators[Math.floor((Math.random() * 3))]

    const expression = firstTerm.toString() + firstOperator + secondTerm.toString() + secondOperator + thirdTerm.toString()
    // Исправлено использование eval():
    // теперь выражение считается безопасно без выполнения строки как кода
    const answer = calculateCaptchaAnswer(
        firstTerm,
        firstOperator,
        secondTerm,
        secondOperator,
        thirdTerm
    ).toString()

    const captcha = {
      captchaId,
      captcha: expression,
      answer
    }
    const captchaInstance = CaptchaModel.build(captcha)
    await captchaInstance.save()
    res.json(captcha)
  }
}

export const verifyCaptcha = () => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captcha = await CaptchaModel.findOne({ where: { captchaId: req.body.captchaId } })
    if ((captcha != null) && req.body.captcha === captcha.answer) {
      next()
    } else {
      res.status(401).send(res.__('Wrong answer to CAPTCHA. Please try again.'))
    }
  } catch (error) {
    next(error)
  }
}

